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
    const user = await this.findUserForAuth(dto.email);
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
    const stored = await this.findStoredRefreshToken(hash);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppException(ErrorCodes.UNAUTHORIZED, 'Session expired. Please sign in again.', HttpStatus.UNAUTHORIZED);
    }

    // Reuse detection: a rotated token being presented again means the
    // refresh-token family may be compromised. Revoke the whole family and
    // audit before denying.
    if (stored.replacedBy && stored.replacedBy !== 'rotated') {
      // Already revoked family — plain denial.
      throw new AppException(ErrorCodes.UNAUTHORIZED, 'Session expired. Please sign in again.', HttpStatus.UNAUTHORIZED);
    }
    if (stored.replacedBy === 'rotated') {
      await this.refreshTokens.manager.query(
        'SELECT app.revoke_refresh_tokens($1, $2, $3)',
        [stored.userId, stored.id, 'family-revoked'],
      );
      await this.audit.record({
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        actorId: stored.userId,
        schoolId: stored.schoolId,
        entityType: 'refresh_token',
        entityId: stored.id,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new AppException(ErrorCodes.UNAUTHORIZED, 'Session expired. Please sign in again.', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.users.findOne({ where: { id: stored.userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCodes.UNAUTHORIZED, 'Session expired. Please sign in again.', HttpStatus.UNAUTHORIZED);
    }

    // Rotation: revoke old, issue new.
    await this.refreshTokens.manager.query(
      'SELECT app.revoke_refresh_token_by_hash($1, $2)',
      [hash, 'rotated'],
    );
    const pair = await this.issueTokens(user, meta);
    return { accessToken: pair.accessToken, refreshToken: pair.refreshToken, expiresIn: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10) };
  }

  async logout(
    refreshToken: string | undefined,
    actor: AuthUser | null,
    meta: RequestMeta,
  ): Promise<void> {
    if (refreshToken) {
      const hash = this.tokens.hashToken(refreshToken);
      await this.refreshTokens.manager.query(
        'SELECT app.revoke_refresh_token_by_hash($1, $2)',
        [hash, 'logged-out'],
      );
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
    await this.refreshTokens.manager.query(
      'SELECT app.revoke_refresh_tokens($1, NULL, $2)',
      [user.id, 'password-changed'],
    );
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

  /**
   * Look up a refresh token via the SECURITY DEFINER gateway
   * (app.find_refresh_token). Auth flows run before the tenant GUC is set,
   * so direct repo reads against the FORCE-RLS table would be denied.
   */
  private async findStoredRefreshToken(hash: string): Promise<{
    id: string;
    userId: string;
    schoolId: string | null;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedBy: string | null;
  } | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = await this.refreshTokens.manager.query('SELECT * FROM app.find_refresh_token($1)', [hash]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      schoolId: r.school_id ?? null,
      tokenHash: r.token_hash,
      expiresAt: new Date(r.expires_at),
      revokedAt: r.revoked_at ? new Date(r.revoked_at) : null,
      replacedBy: r.replaced_by ?? null,
    };
  }

  /**
   * Locate a user for the login path. Prefers the SECURITY DEFINER lookup
   * app.find_user_for_auth (shipped by migration V2) which is the only
   * RLS-compatible way to search by email across tenants when the runtime
   * connects as the least-privilege role; falls back to the repository for
   * un-migrated local databases.
   */
  private async findUserForAuth(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = await this.users.manager.query('SELECT * FROM app.find_user_for_auth($1)', [normalized]);
      if (!rows.length) return null;
      const r = rows[0];
      return this.users.create({
        id: r.id,
        email: r.email,
        phone: r.phone,
        passwordHash: r.password_hash,
        firstName: r.first_name,
        lastName: r.last_name,
        role: r.role,
        status: r.status,
        schoolId: r.school_id,
        branchId: r.branch_id ?? null,
        failedLoginAttempts: r.failed_login_attempts ?? 0,
        lockedUntil: r.locked_until ?? null,
        lastLoginAt: r.last_login_at ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      } as Partial<User>);
    } catch {
      // Function not present yet (pre-V2 database) — repository fallback.
      return this.users.findOne({ where: { email: normalized } });
    }
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
    // Auth flows run before the tenant GUC is set for the session, so
    // refresh-token persistence goes through the SECURITY DEFINER gateway
    // (app.store_refresh_token) — the app role has no direct DML on this
    // FORCE-RLS table.
    await this.refreshTokens.manager.query(
      'SELECT app.store_refresh_token($1, $2, $3, $4, $5, $6)',
      [
        user.id,
        user.schoolId,
        hash,
        new Date(Date.now() + parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10) * 1000),
        meta.ip,
        meta.userAgent,
      ],
    );
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
    // Express req.ip respects the `trust proxy` setting: when TRUST_PROXY=true
    // it derives the client address from x-forwarded-for (as set by the TLS
    // proxy); otherwise it uses the socket address. We never trust the
    // x-forwarded-for header directly, so audit IPs and throttling cannot be
    // spoofed from outside the proxy.
    ip: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  };
}
