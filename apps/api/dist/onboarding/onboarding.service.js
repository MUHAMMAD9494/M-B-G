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
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const school_entity_1 = require("../entities/school.entity");
const branch_entity_1 = require("../entities/branch.entity");
const user_entity_1 = require("../entities/user.entity");
const system_setting_entity_1 = require("../entities/system-setting.entity");
const password_service_1 = require("../auth/password.service");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app-exception");
const error_codes_1 = require("../common/error-codes");
const types_1 = require("@nexora/types");
const NDPA_CONSENT_DOCUMENT = 'NDPA-2023-policy-v1';
const CONSENT_VERSION = '1';
const DEFAULT_BRANCH_NAME = 'Main Branch';
let OnboardingService = class OnboardingService {
    users;
    dataSource;
    password;
    audit;
    logger = new common_1.Logger('OnboardingService');
    constructor(users, dataSource, password, audit) {
        this.users = users;
        this.dataSource = dataSource;
        this.password = password;
        this.audit = audit;
    }
    async registerSchool(dto, meta) {
        const email = dto.adminEmail.trim().toLowerCase();
        const requiredInviteCode = process.env.INVITE_CODE?.trim();
        if (requiredInviteCode) {
            if (!dto.inviteCode || dto.inviteCode.trim() !== requiredInviteCode) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.FORBIDDEN, 'A valid invite code is required to register a school.', common_1.HttpStatus.FORBIDDEN);
            }
        }
        const existing = await this.users.findOne({ where: { email } });
        if (existing) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'An account with this email already exists. Please sign in.', common_1.HttpStatus.CONFLICT);
        }
        const { firstName, lastName } = splitFullName(dto.adminFullName);
        const passwordHash = await this.password.hash(dto.password);
        const result = await this.dataSource.transaction(async (manager) => {
            const school = await manager.save(manager.create(school_entity_1.School, {
                name: dto.schoolName.trim(),
                email,
                phone: dto.adminPhone?.trim() || null,
                timezone: 'Africa/Lagos',
            }));
            await manager.query(`SELECT set_config('app.school_id', $1, true)`, [school.id]);
            await manager.query(`SELECT set_config('app.is_super', 'false', true)`);
            await manager.save(manager.create(branch_entity_1.Branch, {
                schoolId: school.id,
                name: DEFAULT_BRANCH_NAME,
            }));
            const owner = await manager.save(manager.create(user_entity_1.User, {
                schoolId: school.id,
                email,
                phone: dto.adminPhone?.trim() || null,
                passwordHash,
                firstName,
                lastName,
                role: types_1.RoleName.SCHOOL_OWNER,
                status: types_1.UserStatus.ACTIVE,
            }));
            const consentKey = `consent:school:${school.id}:owner`;
            await manager.save(manager.create(system_setting_entity_1.SystemSetting, {
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
            }));
            return { school, owner };
        });
        await this.audit.record({
            action: 'SCHOOL_REGISTERED',
            actorId: result.owner.id,
            schoolId: result.school.id,
            entityType: 'school',
            entityId: result.school.id,
            newValue: { schoolName: result.school.name, ownerRole: types_1.RoleName.SCHOOL_OWNER },
            ...meta,
        });
        this.logger.log(`[onboarding] school ${result.school.id} registered; ` +
            `welcome email NOT sent (EMAIL_PROVIDER not configured - TODO).`);
        return {
            schoolId: result.school.id,
            schoolName: result.school.name,
            ownerEmail: result.owner.email,
        };
    }
    async inviteUser(actor, dto, meta) {
        if (dto.role === types_1.RoleName.SUPER_ADMIN) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.FORBIDDEN, 'SUPER_ADMIN accounts cannot be invited.', common_1.HttpStatus.FORBIDDEN);
        }
        const email = dto.email.trim().toLowerCase();
        const existing = await this.users.findOne({ where: { email } });
        if (existing) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'A user with this email already exists.', common_1.HttpStatus.CONFLICT);
        }
        const unguessableHash = await this.password.hash((0, crypto_1.randomBytes)(24).toString('hex'));
        const user = await this.users.save(this.users.create({
            schoolId: actor.schoolId,
            email,
            phone: null,
            passwordHash: unguessableHash,
            firstName: 'Pending',
            lastName: 'User',
            role: dto.role,
            status: 'pending',
        }));
        await this.audit.record({
            action: 'USER_INVITED',
            actorId: actor.id,
            schoolId: user.schoolId,
            entityType: 'user',
            entityId: user.id,
            newValue: { email: user.email, role: user.role },
            ...meta,
        });
        this.logger.log(`[onboarding] Invitation created (target user id ${user.id}, role ${user.role}, inviter id ${actor.id}); ` +
            `activation email NOT sent (EMAIL_PROVIDER not configured - TODO).`);
        return { userId: user.id };
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource,
        password_service_1.PasswordService,
        audit_service_1.AuditService])
], OnboardingService);
function splitFullName(fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return { firstName: 'Unknown', lastName: 'User' };
    if (parts.length === 1)
        return { firstName: parts[0], lastName: '' };
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}
//# sourceMappingURL=onboarding.service.js.map