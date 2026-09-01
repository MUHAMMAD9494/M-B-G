import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Like, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Teacher } from '../entities/teacher.entity';
import { AttendanceEvent } from '../entities/attendance-event.entity';
import { BiometricProfile } from '../entities/biometric-profile.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TenantScopeService } from '../common/tenant-scope.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { ErrorCodes } from '../common/error-codes';
import { AuthUser, RoleName } from '@nexora/types';

const ERASED_EMAIL_SUFFIX = '@erased.nexora';
const NDPA_CONSENT_DOCUMENT = 'NDPA-2023-policy-v1';

interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

/** Personal-data bundle returned to the data subject (or an authorized admin). */
export interface DataSubjectBundle {
  user: Record<string, unknown>;
  teacher: Record<string, unknown> | null;
  attendanceEvents: AttendanceEvent[];
  biometricProfiles: Record<string, unknown>[];
  notificationPreferences: Record<string, unknown>[];
  consents: Record<string, unknown>[];
}

/** Export envelope required by the NDPA access contract. */
export interface DataSubjectExport {
  exportedAt: string;
  dataType: 'application/json';
  schemaVersion: '1.0';
  data: DataSubjectBundle;
}

/**
 * NDPA 2023 data-subject rights:
 *  - export: access/portability of the user's own personal data;
 *  - erasure: anonymization of the account + deletion of biometric templates
 *    and refresh tokens, with an immutable erasure receipt in system_settings.
 *
 * Tenant safety: the target school is ALWAYS derived from the authenticated
 * actor (self) or from the target user record (admin variant). Client-supplied
 * schoolId is never accepted.
 */
@Injectable()
export class DataSubjectService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly tenantScope: TenantScopeService,
    private readonly audit: AuditService,
  ) {}

  /** Self-service access request. */
  async exportSelf(actor: AuthUser): Promise<DataSubjectExport> {
    const user = await this.users.findOne({ where: { id: actor.id } });
    if (!user) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'User not found.', HttpStatus.NOT_FOUND);
    }
    return this.buildExportBundle(user);
  }

  /** Admin variant (requires users.update, enforced in controller). */
  async exportFor(actor: AuthUser, targetId: string): Promise<DataSubjectExport> {
    const target = await this.users.findOne({ where: { id: targetId } });
    if (!target) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'User not found.', HttpStatus.NOT_FOUND);
    }
    this.assertTenantScope(actor, target);
    return this.buildExportBundle(target);
  }

  /** Self-service erasure. Returns void → controller answers 204. */
  async eraseSelf(actor: AuthUser, meta: RequestMeta): Promise<void> {
    const user = await this.users.findOne({ where: { id: actor.id } });
    if (!user) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'User not found.', HttpStatus.NOT_FOUND);
    }
    await this.eraseUser(user, meta, actor.id);
  }

  /** Admin variant (requires users.update, enforced in controller). */
  async eraseFor(actor: AuthUser, targetId: string, meta: RequestMeta): Promise<void> {
    const target = await this.users.findOne({ where: { id: targetId } });
    if (!target) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'User not found.', HttpStatus.NOT_FOUND);
    }
    this.assertTenantScope(actor, target);
    await this.eraseUser(target, meta, actor.id);
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private async buildExportBundle(user: User): Promise<DataSubjectExport> {
    // RLS-scoped to the target user's school. All tenant-owned tables are read
    // through the tenant transaction manager (defense in depth).
    const bundle = await this.tenantScope.withTenant(user.schoolId, async (manager) => {
      const teachers = await manager
        .getRepository(Teacher)
        .find({ where: { userId: user.id, deletedAt: IsNull() }, order: { createdAt: 'ASC' } });
      const teacherIds = teachers.map((t) => t.id);

      const attendanceEvents = teacherIds.length
        ? await manager
            .getRepository(AttendanceEvent)
            .find({ where: { teacherId: In(teacherIds) }, order: { timestamp: 'ASC' } })
        : [];

      const biometricRows = teacherIds.length
        ? await manager.getRepository(BiometricProfile).find({ where: { teacherId: In(teacherIds) } })
        : [];

      const notificationPreferences = await manager
        .getRepository(NotificationPreference)
        .find({ where: { userId: user.id }, order: { channel: 'ASC' } });

      const consents = await this.collectConsents(manager.getRepository(SystemSetting), user);

      return {
        user: userDto(user),
        teacher: teachers.length ? teacherDto(teachers[0]) : null,
        attendanceEvents,
        biometricProfiles: biometricRows.map(biometricMetaDto),
        notificationPreferences: notificationPreferences.map((p) => ({
          channel: p.channel,
          enabled: p.enabled,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        consents,
      };
    });

    return {
      exportedAt: new Date().toISOString(),
      dataType: 'application/json',
      schemaVersion: '1.0',
      data: bundle,
    };
  }

  /** Consent records in system_settings matching this user (by email or userId). */
  private async collectConsents(
    settingsRepo: Repository<SystemSetting>,
    user: User,
  ): Promise<Record<string, unknown>[]> {
    const rows = await settingsRepo.find({ where: { key: Like(`${CONSENT_KEY_PREFIX}%`) } });
    const consents: Record<string, unknown>[] = [];
    for (const row of rows) {
      if (!row.key.startsWith(CONSENT_KEY_PREFIX)) continue;
      try {
        const parsed = JSON.parse(row.value) as Record<string, unknown>;
        if (!parsed || typeof parsed !== 'object') continue;
        const subjectEmail = String(parsed.email ?? '').toLowerCase();
        const subjectUserId = parsed.userId;
        const matches = subjectEmail === user.email.toLowerCase() || subjectUserId === user.id;
        if (matches) {
          consents.push({ key: row.key, createdAt: row.createdAt, updatedAt: row.updatedAt, ...parsed });
        }
      } catch {
        // Malformed consent row — skip; never fail the export.
      }
    }
    return consents;
  }

  /**
   * Anonymize + delete. Runs in a single tenant-scoped transaction:
   *  - biometric_profiles (their rows, incl. soft-deleted teachers) → DELETE
   *  - refresh_tokens (their rows) → DELETE
   *  - users → email {id}@erased.nexora, name "Erased User", phone NULL, status 'erased'
   *  - system_settings → immutable 'erasure:{userId}' receipt
   */
  private async eraseUser(user: User, meta: RequestMeta, initiatorId: string): Promise<void> {
    if ((user.status as string) === 'erased') {
      throw new AppException(ErrorCodes.CONFLICT, 'This account has already been erased.', HttpStatus.CONFLICT);
    }

    await this.tenantScope.withTenant(user.schoolId, async (manager) => {
      // Include soft-deleted teachers: their biometric templates still exist
      // and belong to this data subject.
      const teachers = await manager.getRepository(Teacher).find({ where: { userId: user.id }, withDeleted: true });
      const teacherIds = teachers.map((t) => t.id);

      if (teacherIds.length) {
        await manager.getRepository(BiometricProfile).delete({ teacherId: In(teacherIds) });
      }
      await manager.getRepository(RefreshToken).delete({ userId: user.id });

      await manager.getRepository(User).update(user.id, {
        email: `${user.id}${ERASED_EMAIL_SUFFIX}`,
        phone: null,
        firstName: 'Erased',
        lastName: 'User',
        status: 'erased' as never, // varchar(20) column; UserStatus enum will grow
      });

      await manager.getRepository(SystemSetting).save(
        manager.getRepository(SystemSetting).create({
          schoolId: user.schoolId,
          key: `erasure:${user.id}`,
          value: JSON.stringify({
            userId: user.id,
            erasedAt: new Date().toISOString(),
            requestedBy: initiatorId,
            type: 'erasure',
            version: '1',
            document: NDPA_CONSENT_DOCUMENT,
            // NOTE: original email/phone intentionally NOT stored here (true erasure).
          }),
        }),
      );
    });

    await this.audit.record({
      action: 'DATA_SUBJECT_ERASURE',
      actorId: initiatorId,
      schoolId: user.schoolId,
      entityType: 'user',
      entityId: user.id,
      newValue: {
        status: 'erased',
        email: `${user.id}${ERASED_EMAIL_SUFFIX}`,
        biometricProfilesDeleted: true,
        refreshTokensDeleted: true,
        erasureReceipt: `erasure:${user.id}`,
      },
      ...meta,
    });
  }

  /** SUPER_ADMIN may target any school; everyone else only their own. */
  private assertTenantScope(actor: AuthUser, target: User): void {
    if (actor.role === RoleName.SUPER_ADMIN) return;
    if (target.schoolId !== actor.schoolId) {
      throw new AppException(
        ErrorCodes.TENANT_ACCESS_DENIED,
        'This resource belongs to another school.',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}

const CONSENT_KEY_PREFIX = 'consent:';

/** User record without password_hash / security metadata. */
function userDto(u: User): Record<string, unknown> {
  return {
    id: u.id,
    schoolId: u.schoolId,
    email: u.email,
    phone: u.phone,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

/** Teacher record (subject's own personnel data). */
function teacherDto(t: Teacher): Record<string, unknown> {
  return {
    id: t.id,
    schoolId: t.schoolId,
    branchId: t.branchId,
    userId: t.userId,
    employeeId: t.employeeId,
    firstName: t.firstName,
    lastName: t.lastName,
    phone: t.phone,
    email: t.email,
    department: t.department,
    designation: t.designation,
    employmentStatus: t.employmentStatus,
    attendanceStatus: t.attendanceStatus,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/** Biometric metadata ONLY — embeddingHash is a hash of the template and is never exported. */
function biometricMetaDto(b: BiometricProfile): Record<string, unknown> {
  return {
    id: b.id,
    schoolId: b.schoolId,
    teacherId: b.teacherId,
    providerType: b.providerType,
    status: b.status,
    enrolledBy: b.enrolledBy,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}