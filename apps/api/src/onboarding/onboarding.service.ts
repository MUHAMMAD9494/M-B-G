import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { School } from '../entities/school.entity';
import { Branch } from '../entities/branch.entity';
import { User } from '../entities/user.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { ErrorCodes } from '../common/error-codes';
import { InviteUserDto, RegisterSchoolDto } from './dto/onboarding.dto';
import { AuthUser, RoleName, UserStatus } from '@nexora/types';

const NDPA_CONSENT_DOCUMENT = 'NDPA-2023-policy-v1';
const CONSENT_VERSION = '1';
const DEFAULT_BRANCH_NAME = 'Main Branch';

interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

/**
 * Commercial onboarding + provisioning.
 *
 * School self-registration provisions a complete tenant in ONE transaction:
 *   school  → branches ('Main Branch') → school_owner user → consent record.
 * Consent is recorded in system_settings under
 *   `consent:school:{schoolId}:owner` (NDPA 2023 alignment).
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger('OnboardingService');

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly password: PasswordService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Self-register a school (public). Role of NEXORA (processor) vs school
   * (controller) is established at this point and recorded in the consent row.
   */
  async registerSchool(dto: RegisterSchoolDto, meta: RequestMeta): Promise<{ schoolId: string; schoolName: string; ownerEmail: string }> {
    const email = dto.adminEmail.trim().toLowerCase();

    // (a) Optional invite-code gate. Only enforced when INVITE_CODE env is set.
    const requiredInviteCode = process.env.INVITE_CODE?.trim();
    if (requiredInviteCode) {
      if (!dto.inviteCode || dto.inviteCode.trim() !== requiredInviteCode) {
        throw new AppException(ErrorCodes.FORBIDDEN, 'A valid invite code is required to register a school.', HttpStatus.FORBIDDEN);
      }
    }

    // (b) Email uniqueness (users table; race window is closed by unique index).
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new AppException(ErrorCodes.CONFLICT, 'An account with this email already exists. Please sign in.', HttpStatus.CONFLICT);
    }

    const { firstName, lastName } = splitFullName(dto.adminFullName);
    const passwordHash = await this.password.hash(dto.password);

    // (c) ONE transaction: school + branch + owner + consent. The consent row
    //     lives in an RLS-protected table, so app.school_id is set inside the
    //     transaction before writing rows owned by the freshly-created tenant.
    const result = await this.dataSource.transaction(async (manager) => {
      const school = await manager.save(
        manager.create(School, {
          name: dto.schoolName.trim(),
          email,
          phone: dto.adminPhone?.trim() || null,
          timezone: 'Africa/Lagos',
        }),
      );

      // RLS context for the new tenant BEFORE any tenant-owned row is written
      // (branches / system_settings are RLS-protected; required when the
      // runtime connects as the least-privilege nexora_app role).
      await manager.query(`SELECT set_config('app.school_id', $1, true)`, [school.id]);
      await manager.query(`SELECT set_config('app.is_super', 'false', true)`);

      await manager.save(
        manager.create(Branch, {
          schoolId: school.id,
          name: DEFAULT_BRANCH_NAME,
        }),
      );

      const owner = await manager.save(
        manager.create(User, {
          schoolId: school.id,
          email,
          phone: dto.adminPhone?.trim() || null,
          passwordHash,
          firstName,
          lastName,
          role: RoleName.SCHOOL_OWNER,
          status: UserStatus.ACTIVE,
        }),
      );

      const consentKey = `consent:school:${school.id}:owner`;
      await manager.save(
        manager.create(SystemSetting, {
          schoolId: school.id,
          key: consentKey,
          value: JSON.stringify({
            name: dto.adminFullName.trim(),
            email,
            type: 'school_owner',
            userId: owner.id,
            grantedAt: new Date().toISOString(),
            version: CONSENT_VERSION,
            document: NDPA_CONSENT_DOCUMENT,
          }),
        }),
      );

      return { school, owner };
    });

    await this.audit.record({
      action: 'SCHOOL_REGISTERED',
      actorId: result.owner.id,
      schoolId: result.school.id,
      entityType: 'school',
      entityId: result.school.id,
      newValue: { schoolName: result.school.name, ownerRole: RoleName.SCHOOL_OWNER },
      ...meta,
    });

    // (d) TODO(EMAIL_PROVIDER): dispatch a welcome + credential-setup email.
    //     Pluggable provider (e.g. Resend/SES) — not wired because no
    //     credentials are available in this environment.
    // Do not log PII (emails, school names); only school id for traceability.
    this.logger.log(
      `[onboarding] school ${result.school.id} registered; ` +
        `welcome email NOT sent (EMAIL_PROVIDER not configured - TODO).`,
    );

    return {
      schoolId: result.school.id,
      schoolName: result.school.name,
      ownerEmail: result.owner.email,
    };
  }

  /**
   * Invite a school member: creates a `pending` user with a random unrecoverable
   * password hash (cannot log in until activated / reset). Returns the new id;
   * activation + email dispatch are TODO(EMAIL_PROVIDER).
   */
  async inviteUser(actor: AuthUser, dto: InviteUserDto, meta: RequestMeta): Promise<{ userId: string }> {
    if (dto.role === RoleName.SUPER_ADMIN) {
      throw new AppException(ErrorCodes.FORBIDDEN, 'SUPER_ADMIN accounts cannot be invited.', HttpStatus.FORBIDDEN);
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new AppException(ErrorCodes.CONFLICT, 'A user with this email already exists.', HttpStatus.CONFLICT);
    }

    // Random, unrecoverable initial hash — the invitee is not expected to know
    // it; a provider (email/SMS) supplies the activation link (TODO).
    const unguessableHash = await this.password.hash(randomBytes(24).toString('hex'));

    const user = await this.users.save(
      this.users.create({
        schoolId: actor.schoolId,
        email,
        phone: null,
        passwordHash: unguessableHash,
        firstName: 'Pending',
        lastName: 'User',
        role: dto.role,
        status: 'pending' as never, // varchar(20) column; UserStatus enum will grow
      }),
    );

    await this.audit.record({
      action: 'USER_INVITED',
      actorId: actor.id,
      schoolId: user.schoolId,
      entityType: 'user',
      entityId: user.id,
      newValue: { email: user.email, role: user.role },
      ...meta,
    });

    this.logger.log(
      `[onboarding] Invitation created (target user id ${user.id}, role ${user.role}, inviter id ${actor.id}); ` +
        `activation email NOT sent (EMAIL_PROVIDER not configured - TODO).`,
    );

    return { userId: user.id };
  }
}

/** Splits a free-form full name into first/last name columns (each ≤ 100 chars). */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Unknown', lastName: 'User' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}