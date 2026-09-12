"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
exports.requestMeta = requestMeta;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const refresh_token_entity_1 = require("../entities/refresh-token.entity");
const password_service_1 = require("./password.service");
const token_service_1 = require("./token.service");
const audit_service_1 = require("../audit/audit.service");
const rbac_service_1 = require("../rbac/rbac.service");
const app_exception_1 = require("../common/app-exception");
const error_codes_1 = require("../common/error-codes");
const types_1 = require("@nexora/types");
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
let AuthService = class AuthService {
    users;
    refreshTokens;
    password;
    tokens;
    audit;
    rbac;
    constructor(users, refreshTokens, password, tokens, audit, rbac) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.password = password;
        this.tokens = tokens;
        this.audit = audit;
        this.rbac = rbac;
    }
    async login(dto, meta) {
        const user = await this.findUserForAuth(dto.email);
        if (!user) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.INVALID_CREDENTIALS, 'Incorrect email or password.', common_1.HttpStatus.UNAUTHORIZED);
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.ACCOUNT_LOCKED, `Account temporarily locked. Try again after ${user.lockedUntil.toISOString()}.`, 423);
        }
        if (user.status !== types_1.UserStatus.ACTIVE) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.ACCOUNT_DISABLED, 'This account has been disabled. Contact your administrator.', common_1.HttpStatus.FORBIDDEN);
        }
        const valid = await this.password.verify(dto.password, user.passwordHash);
        if (!valid) {
            const attempts = user.failedLoginAttempts + 1;
            const locked = attempts >= MAX_FAILED_ATTEMPTS;
            await this.users.update(user.id, {
                failedLoginAttempts: attempts,
                lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
            });
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.INVALID_CREDENTIALS, 'Incorrect email or password.', common_1.HttpStatus.UNAUTHORIZED);
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
    async refresh(refreshToken, meta) {
        if (!refreshToken) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.UNAUTHORIZED, 'Refresh token missing.', common_1.HttpStatus.UNAUTHORIZED);
        }
        const hash = this.tokens.hashToken(refreshToken);
        const stored = await this.findStoredRefreshToken(hash);
        if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.UNAUTHORIZED, 'Session expired. Please sign in again.', common_1.HttpStatus.UNAUTHORIZED);
        }
        if (stored.replacedBy && stored.replacedBy !== 'rotated') {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.UNAUTHORIZED, 'Session expired. Please sign in again.', common_1.HttpStatus.UNAUTHORIZED);
        }
        if (stored.replacedBy === 'rotated') {
            await this.refreshTokens.manager.query('SELECT app.revoke_refresh_tokens($1, $2, $3)', [stored.userId, stored.id, 'family-revoked']);
            await this.audit.record({
                action: 'REFRESH_TOKEN_REUSE_DETECTED',
                actorId: stored.userId,
                schoolId: stored.schoolId,
                entityType: 'refresh_token',
                entityId: stored.id,
                ipAddress: meta.ip,
                userAgent: meta.userAgent,
            });
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.UNAUTHORIZED, 'Session expired. Please sign in again.', common_1.HttpStatus.UNAUTHORIZED);
        }
        const user = await this.users.findOne({ where: { id: stored.userId } });
        if (!user || user.status !== types_1.UserStatus.ACTIVE) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.UNAUTHORIZED, 'Session expired. Please sign in again.', common_1.HttpStatus.UNAUTHORIZED);
        }
        await this.refreshTokens.manager.query('SELECT app.revoke_refresh_token_by_hash($1, $2)', [hash, 'rotated']);
        const pair = await this.issueTokens(user, meta);
        return { accessToken: pair.accessToken, refreshToken: pair.refreshToken, expiresIn: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10) };
    }
    async logout(refreshToken, actor, meta) {
        if (refreshToken) {
            const hash = this.tokens.hashToken(refreshToken);
            await this.refreshTokens.manager.query('SELECT app.revoke_refresh_token_by_hash($1, $2)', [hash, 'logged-out']);
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
    async me(actor) {
        return actor;
    }
    async changePassword(actor, dto, meta) {
        const user = await this.users.findOne({ where: { id: actor.id } });
        if (!user)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'User not found.', common_1.HttpStatus.NOT_FOUND);
        const ok = await this.password.verify(dto.currentPassword, user.passwordHash);
        if (!ok) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.INVALID_CREDENTIALS, 'Current password is incorrect.', common_1.HttpStatus.BAD_REQUEST);
        }
        const hash = await this.password.hash(dto.newPassword);
        await this.users.update(user.id, { passwordHash: hash });
        await this.refreshTokens.manager.query('SELECT app.revoke_refresh_tokens($1, NULL, $2)', [user.id, 'password-changed']);
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
    async findStoredRefreshToken(hash) {
        const rows = await this.refreshTokens.manager.query('SELECT * FROM app.find_refresh_token($1)', [hash]);
        if (!rows.length)
            return null;
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
    async findUserForAuth(email) {
        const normalized = email.toLowerCase();
        try {
            const rows = await this.users.manager.query('SELECT * FROM app.find_user_for_auth($1)', [normalized]);
            if (!rows.length)
                return null;
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
            });
        }
        catch {
            return this.users.findOne({ where: { email: normalized } });
        }
    }
    async issueTokens(user, meta) {
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
        await this.refreshTokens.manager.query('SELECT app.store_refresh_token($1, $2, $3, $4, $5, $6)', [
            user.id,
            user.schoolId,
            hash,
            new Date(Date.now() + parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10) * 1000),
            meta.ip,
            meta.userAgent,
        ]);
        return { accessToken, refreshToken };
    }
    toAuthUser(user, permissions) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        password_service_1.PasswordService,
        token_service_1.TokenService,
        audit_service_1.AuditService,
        rbac_service_1.RbacService])
], AuthService);
function requestMeta(req) {
    return {
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
    };
}
//# sourceMappingURL=auth.service.js.map