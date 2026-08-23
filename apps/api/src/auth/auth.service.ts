import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { AuditService } from '../audit/audit.service';
import { RbacService } from '../rbac/rbac.service';
import { LoginDto, ChangePasswordDto } from './dto/auth.dto';
import { AppException } from '../common/app-exception';
import { ErrorCodes } from '../common/error-codes';
import { AuthUser, UserStatus, Permission } from '@nexora/types';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly rbac: RbacService,
  ) {}

  async login(dto: LoginDto, meta: RequestMeta): Promise<{ user: AuthUser; accessToken: string; expiresIn: number; refreshToken: string }> {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new AppException(ErrorCodes.INVALID_CREDENTIALS, 'Incorrect email or password.', HttpStatus.UNAUTHORIZED);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppException(ErrorCodes.ACCOUNT_LOCKED, `Account temporarily locked. Try again after ${user.lockedUntil.toISOString()}.`, 423 as HttpStatus);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCodes.ACCOUNT_DISABLED, 'This account has been disabled. Contact your administrator.', HttpStatus.FORBIDDEN);
    }

    const valid = await this.password.verify(dto.password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const locked = attempts >= MAX_FAILED_ATTEMPTS;
      await this.users.update(user.id, {
        failedLoginAttempts: attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
      });
      throw new AppException(ErrorCodes.INVALID_CREDENTIALS, 'Incorrect email or password.', HttpStatus.UNAUTHORIZED);
    }

    await this.users.update(user.id, { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() });

    const permissions = this.rbac.permissionsForRole(user.role);
    const pair = await this.issueTokens(user, meta);
    await this.audit.record({
      action: 'LOGIN',
      actorId: user.id,
      schoolId: user.schoolId,
      entityType: 'user',
      entityId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      user: this.toAuthUser(user, permissions),
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      expiresIn: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),
    };
  }

  async refresh(refreshToken: string | undefined, meta: RequestMeta): Promise<{ accessToken: string; expiresIn: number; refreshToken: string }> {
    if (!refreshToken) {
      throw new AppException(ErrorCodes.UNAUTHORIZED, 'Refresh token missing.', HttpStatus.UNAUTHORIZED);
    }
    const hash = this.tokens.hashToken(refreshToken);
    const stored = await this.refreshTokens.findOne({ where: { tokenHash: hash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppException(ErrorCodes.UNAUTHORIZED, 'Session expired. Please sign in again.', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.users.findOne({ where: { id: stored.userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCodes.UNAUTHORIZED, 'Session expired. Please sign in again.', HttpStatus.UNAUTHORIZED);
    }

    // Rotation: revoke old, issue new.
    await this.refreshTokens.update(stored.id, { revokedAt: new Date(), replacedBy: 'rotated' });
    const pair = await this.issueTokens(user, meta);
    return { accessToken: pair.accessToken, refreshToken: pair.refreshToken, expiresIn: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10) };
  }

  async logout(refreshToken: string | undefined, actor: AuthUser | null, meta: RequestMeta): Promise<void> {
    if (refreshToken) {
      const hash = this.tokens.hashToken(refreshToken);
      await this.refreshTokens.update({ tokenHash: hash }, { revokedAt: new Date() });
    }
    if (actor) {
      await this.audit.record({
        action: 'LOGOUT',
        actorId: actor.id,
        schoolId: actor.schoolId,
        entityType: 'user',
        entityId: actor.id,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
    }
  }

  async me(actor: AuthUser): Promise<AuthUser> {
    return actor;
  }

  async changePassword(actor: AuthUser, dto: ChangePasswordDto, meta: RequestMeta): Promise<void> {
    const user = await this.users.findOne({ where: { id: actor.id } });
    if (!user) throw new AppException(ErrorCodes.NOT_FOUND, 'User not found.', HttpStatus.NOT_FOUND);

    const ok = await this.password.verify(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new AppException(ErrorCodes.INVALID_CREDENTIALS, 'Current password is incorrect.', HttpStatus.BAD_REQUEST);
    }

    const hash = await this.password.hash(dto.newPassword);
    await this.users.update(user.id, { passwordHash: hash });
    // Revoke all sessions (force re-login everywhere).
    await this.refreshTokens.createQueryBuilder().update().set({ revokedAt: new Date() }).where('user_id = :uid AND revoked_at IS NULL', { uid: user.id }).execute();
    await this.audit.record({
      action: 'PASSWORD_CHANGED',
      actorId: user.id,
      schoolId: user.schoolId,
      entityType: 'user',
      entityId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  private async issueTokens(user: User, meta: RequestMeta): Promise<TokenPair> {
    const permissions = this.rbac.permissionsForRole(user.role);
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      schoolId: user.schoolId,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      permissions,
    });
    const { token: refreshToken, hash } = this.tokens.generateRefreshToken();
    await this.refreshTokens.insert({
      userId: user.id,
      schoolId: user.schoolId,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10) * 1000),
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return { accessToken, refreshToken };
  }

  private toAuthUser(user: User, permissions: Permission[]): AuthUser {
    return {
      id: user.id,
      schoolId: user.schoolId,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      permissions,
    };
  }
}

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

export function requestMeta(req: Request): RequestMeta {
  return {
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  };
}
