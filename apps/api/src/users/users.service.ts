import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { ErrorCodes } from '../common/error-codes';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { AuthUser, RoleName, UserStatus } from '@nexora/types';

/**
 * User administration. Tenant rule: a non-super-admin actor can only
 * create/see/update users within their own school (enforced here + RLS on
 * users table for reads via app.school_id).
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly password: PasswordService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: { page?: number; limit?: number; role?: RoleName; status?: UserStatus; search?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const qb = this.users.createQueryBuilder('u')
      .orderBy('u.createdAt', 'DESC');

    if (actor.role !== RoleName.SUPER_ADMIN) {
      qb.andWhere('u.schoolId = :schoolId', { schoolId: actor.schoolId });
    }
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status) qb.andWhere('u.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere('(u.email ILIKE :s OR u.firstName ILIKE :s OR u.lastName ILIKE :s)', { s: `%${query.search}%` });
    }

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: rows.map((u) => this.toDto(u)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(actor: AuthUser, dto: CreateUserDto, meta: { ip: string | null; userAgent: string | null }) {
    const email = dto.email.toLowerCase();
    const exists = await this.users.findOne({ where: { email } });
    if (exists) {
      throw new AppException(ErrorCodes.CONFLICT, 'A user with this email already exists.', HttpStatus.CONFLICT);
    }

    // Role ceiling: an actor may never create users above their own rank.
    if (!this.canAssignRole(actor.role, dto.role)) {
      throw new AppException(
        ErrorCodes.FORBIDDEN,
        `Role ${dto.role} cannot be assigned by a ${actor.role}.`, HttpStatus.FORBIDDEN,
      );
    }

    const schoolId = actor.role === RoleName.SUPER_ADMIN ? (dto.schoolId ?? null) : actor.schoolId;
    if (actor.role !== RoleName.SUPER_ADMIN && dto.schoolId && dto.schoolId !== actor.schoolId) {
      throw new AppException(ErrorCodes.TENANT_ACCESS_DENIED, 'You can only create users for your own school.', HttpStatus.FORBIDDEN);
    }

    const user = this.users.create({
      email,
      phone: dto.phone ?? null,
      passwordHash: await this.password.hash(dto.password),
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      schoolId,
      status: UserStatus.ACTIVE,
    });
    const saved = await this.users.save(user);
    await this.audit.record({
      action: 'USER_CREATED',
      actorId: actor.id,
      schoolId: saved.schoolId,
      entityType: 'user',
      entityId: saved.id,
      newValue: { email: saved.email, role: saved.role },
      ...meta,
    });
    return this.toDto(saved);
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto, meta: { ip: string | null; userAgent: string | null }) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new AppException(ErrorCodes.NOT_FOUND, 'User not found.', HttpStatus.NOT_FOUND);
    this.assertTenant(actor, user);

    const previousRole = user.role;

    // Role ceiling on promotion/demotion + no self-role changes.
    if (dto.role) {
      if (user.id === actor.id) {
        throw new AppException(ErrorCodes.FORBIDDEN, 'You cannot change your own role.', HttpStatus.FORBIDDEN);
      }
      if (!this.canAssignRole(actor.role, dto.role)) {
        throw new AppException(
          ErrorCodes.FORBIDDEN,
          `Role ${dto.role} cannot be assigned by a ${actor.role}.`, HttpStatus.FORBIDDEN,
        );
      }
      // Only a SUPER_ADMIN may modify another SUPER_ADMIN's account.
      if (user.role === RoleName.SUPER_ADMIN && actor.role !== RoleName.SUPER_ADMIN) {
        throw new AppException(ErrorCodes.FORBIDDEN, 'You cannot modify a SUPER_ADMIN account.', HttpStatus.FORBIDDEN);
      }
      user.role = dto.role;
    }
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.status !== undefined) user.status = dto.status;

    const saved = await this.users.save(user);
    await this.audit.record({
      action: 'USER_UPDATED',
      actorId: actor.id,
      schoolId: saved.schoolId,
      entityType: 'user',
      entityId: saved.id,
      oldValue: { role: previousRole },
      newValue: { role: saved.role },
      ...meta,
    });
    return this.toDto(saved);
  }

  async setStatus(actor: AuthUser, id: string, status: UserStatus, meta: { ip: string | null; userAgent: string | null }) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new AppException(ErrorCodes.NOT_FOUND, 'User not found.', HttpStatus.NOT_FOUND);
    this.assertTenant(actor, user);
    if (user.id === actor.id) {
      throw new AppException(ErrorCodes.CONFLICT, 'You cannot disable your own account.', HttpStatus.CONFLICT);
    }

    await this.users.update(user.id, { status });
    await this.audit.record({
      action: status === UserStatus.DISABLED ? 'USER_DISABLED' : 'USER_ENABLED',
      actorId: actor.id,
      schoolId: user.schoolId,
      entityType: 'user',
      entityId: user.id,
      oldValue: { status: user.status },
      newValue: { status },
      ...meta,
    });
    return this.toDto({ ...user, status });
  }

  private assertTenant(actor: AuthUser, target: User): void {
    if (actor.role === RoleName.SUPER_ADMIN) return;
    if (target.schoolId !== actor.schoolId) {
      throw new AppException(ErrorCodes.TENANT_ACCESS_DENIED, 'This resource belongs to another school.', HttpStatus.FORBIDDEN);
    }
  }

  /**
   * Role-assignment ceiling. Only SUPER_ADMIN may assign SUPER_ADMIN; every
   * other actor may only assign roles strictly below their own rank. This
   * closes the privilege-escalation path where any users.create/users.update
   * holder could mint a SUPER_ADMIN.
   */
  private canAssignRole(actorRole: RoleName, targetRole: RoleName): boolean {
    if (actorRole === RoleName.SUPER_ADMIN) return true;
    const hierarchy: Record<string, number> = {
      [RoleName.SUPER_ADMIN]: 5,
      [RoleName.SCHOOL_OWNER]: 4,
      [RoleName.SCHOOL_ADMIN]: 3,
      [RoleName.HR_ADMIN]: 2,
      [RoleName.PRINCIPAL]: 2,
      [RoleName.VICE_PRINCIPAL]: 1,
      [RoleName.TEACHER]: 0,
      [RoleName.STAFF]: 0,
    };
    return (hierarchy[targetRole] ?? 0) < (hierarchy[actorRole] ?? 0);
  }

  private toDto(u: User): Record<string, unknown> {
    // passwordHash deliberately excluded.
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
}
