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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const password_service_1 = require("../auth/password.service");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app-exception");
const error_codes_1 = require("../common/error-codes");
const types_1 = require("@nexora/types");
let UsersService = class UsersService {
    users;
    password;
    audit;
    constructor(users, password, audit) {
        this.users = users;
        this.password = password;
        this.audit = audit;
    }
    async list(actor, query) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(100, Math.max(1, query.limit ?? 20));
        const qb = this.users.createQueryBuilder('u')
            .orderBy('u.createdAt', 'DESC');
        if (actor.role !== types_1.RoleName.SUPER_ADMIN) {
            qb.andWhere('u.schoolId = :schoolId', { schoolId: actor.schoolId });
        }
        if (query.role)
            qb.andWhere('u.role = :role', { role: query.role });
        if (query.status)
            qb.andWhere('u.status = :status', { status: query.status });
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
    async create(actor, dto, meta) {
        const email = dto.email.toLowerCase();
        const exists = await this.users.findOne({ where: { email } });
        if (exists) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'A user with this email already exists.', common_1.HttpStatus.CONFLICT);
        }
        if (!this.canAssignRole(actor.role, dto.role)) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.FORBIDDEN, `Role ${dto.role} cannot be assigned by a ${actor.role}.`, common_1.HttpStatus.FORBIDDEN);
        }
        const schoolId = actor.role === types_1.RoleName.SUPER_ADMIN ? (dto.schoolId ?? null) : actor.schoolId;
        if (actor.role !== types_1.RoleName.SUPER_ADMIN && dto.schoolId && dto.schoolId !== actor.schoolId) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.TENANT_ACCESS_DENIED, 'You can only create users for your own school.', common_1.HttpStatus.FORBIDDEN);
        }
        const user = this.users.create({
            email,
            phone: dto.phone ?? null,
            passwordHash: await this.password.hash(dto.password),
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: dto.role,
            schoolId,
            status: types_1.UserStatus.ACTIVE,
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
    async update(actor, id, dto, meta) {
        const user = await this.users.findOne({ where: { id } });
        if (!user)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'User not found.', common_1.HttpStatus.NOT_FOUND);
        this.assertTenant(actor, user);
        const previousRole = user.role;
        if (dto.role) {
            if (user.id === actor.id) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.FORBIDDEN, 'You cannot change your own role.', common_1.HttpStatus.FORBIDDEN);
            }
            if (!this.canAssignRole(actor.role, dto.role)) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.FORBIDDEN, `Role ${dto.role} cannot be assigned by a ${actor.role}.`, common_1.HttpStatus.FORBIDDEN);
            }
            if (user.role === types_1.RoleName.SUPER_ADMIN && actor.role !== types_1.RoleName.SUPER_ADMIN) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.FORBIDDEN, 'You cannot modify a SUPER_ADMIN account.', common_1.HttpStatus.FORBIDDEN);
            }
            user.role = dto.role;
        }
        if (dto.firstName !== undefined)
            user.firstName = dto.firstName;
        if (dto.lastName !== undefined)
            user.lastName = dto.lastName;
        if (dto.phone !== undefined)
            user.phone = dto.phone;
        if (dto.status !== undefined)
            user.status = dto.status;
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
    async setStatus(actor, id, status, meta) {
        const user = await this.users.findOne({ where: { id } });
        if (!user)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'User not found.', common_1.HttpStatus.NOT_FOUND);
        this.assertTenant(actor, user);
        if (user.id === actor.id) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'You cannot disable your own account.', common_1.HttpStatus.CONFLICT);
        }
        await this.users.update(user.id, { status });
        await this.audit.record({
            action: status === types_1.UserStatus.DISABLED ? 'USER_DISABLED' : 'USER_ENABLED',
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
    assertTenant(actor, target) {
        if (actor.role === types_1.RoleName.SUPER_ADMIN)
            return;
        if (target.schoolId !== actor.schoolId) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.TENANT_ACCESS_DENIED, 'This resource belongs to another school.', common_1.HttpStatus.FORBIDDEN);
        }
    }
    canAssignRole(actorRole, targetRole) {
        if (actorRole === types_1.RoleName.SUPER_ADMIN)
            return true;
        const hierarchy = {
            [types_1.RoleName.SUPER_ADMIN]: 5,
            [types_1.RoleName.SCHOOL_OWNER]: 4,
            [types_1.RoleName.SCHOOL_ADMIN]: 3,
            [types_1.RoleName.HR_ADMIN]: 2,
            [types_1.RoleName.PRINCIPAL]: 2,
            [types_1.RoleName.VICE_PRINCIPAL]: 1,
            [types_1.RoleName.TEACHER]: 0,
            [types_1.RoleName.STAFF]: 0,
        };
        return (hierarchy[targetRole] ?? 0) < (hierarchy[actorRole] ?? 0);
    }
    toDto(u) {
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        password_service_1.PasswordService,
        audit_service_1.AuditService])
], UsersService);
//# sourceMappingURL=users.service.js.map