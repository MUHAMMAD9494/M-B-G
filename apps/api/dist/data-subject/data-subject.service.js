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
exports.DataSubjectService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const attendance_event_entity_1 = require("../entities/attendance-event.entity");
const biometric_profile_entity_1 = require("../entities/biometric-profile.entity");
const notification_preference_entity_1 = require("../entities/notification-preference.entity");
const system_setting_entity_1 = require("../entities/system-setting.entity");
const refresh_token_entity_1 = require("../entities/refresh-token.entity");
const tenant_scope_service_1 = require("../common/tenant-scope.service");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app-exception");
const error_codes_1 = require("../common/error-codes");
const types_1 = require("@nexora/types");
const ERASED_EMAIL_SUFFIX = '@erased.nexora';
const NDPA_CONSENT_DOCUMENT = 'NDPA-2023-policy-v1';
let DataSubjectService = class DataSubjectService {
    users;
    tenantScope;
    audit;
    constructor(users, tenantScope, audit) {
        this.users = users;
        this.tenantScope = tenantScope;
        this.audit = audit;
    }
    async exportSelf(actor) {
        const user = await this.users.findOne({ where: { id: actor.id } });
        if (!user) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'User not found.', common_1.HttpStatus.NOT_FOUND);
        }
        return this.buildExportBundle(user);
    }
    async exportFor(actor, targetId) {
        const target = await this.users.findOne({ where: { id: targetId } });
        if (!target) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'User not found.', common_1.HttpStatus.NOT_FOUND);
        }
        this.assertTenantScope(actor, target);
        return this.buildExportBundle(target);
    }
    async eraseSelf(actor, meta) {
        const user = await this.users.findOne({ where: { id: actor.id } });
        if (!user) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'User not found.', common_1.HttpStatus.NOT_FOUND);
        }
        await this.eraseUser(user, meta, actor.id);
    }
    async eraseFor(actor, targetId, meta) {
        const target = await this.users.findOne({ where: { id: targetId } });
        if (!target) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'User not found.', common_1.HttpStatus.NOT_FOUND);
        }
        this.assertTenantScope(actor, target);
        await this.eraseUser(target, meta, actor.id);
    }
    async buildExportBundle(user) {
        const bundle = await this.tenantScope.withTenant(user.schoolId, async (manager) => {
            const teachers = await manager
                .getRepository(teacher_entity_1.Teacher)
                .find({ where: { userId: user.id, deletedAt: (0, typeorm_2.IsNull)() }, order: { createdAt: 'ASC' } });
            const teacherIds = teachers.map((t) => t.id);
            const attendanceEvents = teacherIds.length
                ? await manager
                    .getRepository(attendance_event_entity_1.AttendanceEvent)
                    .find({ where: { teacherId: (0, typeorm_2.In)(teacherIds) }, order: { timestamp: 'ASC' } })
                : [];
            const biometricRows = teacherIds.length
                ? await manager.getRepository(biometric_profile_entity_1.BiometricProfile).find({ where: { teacherId: (0, typeorm_2.In)(teacherIds) } })
                : [];
            const notificationPreferences = await manager
                .getRepository(notification_preference_entity_1.NotificationPreference)
                .find({ where: { userId: user.id }, order: { channel: 'ASC' } });
            const consents = await this.collectConsents(manager.getRepository(system_setting_entity_1.SystemSetting), user);
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
    async collectConsents(settingsRepo, user) {
        const rows = await settingsRepo.find({ where: { key: (0, typeorm_2.Like)(`${CONSENT_KEY_PREFIX}%`) } });
        const consents = [];
        for (const row of rows) {
            if (!row.key.startsWith(CONSENT_KEY_PREFIX))
                continue;
            try {
                const parsed = JSON.parse(row.value);
                if (!parsed || typeof parsed !== 'object')
                    continue;
                const subjectEmail = String(parsed.email ?? '').toLowerCase();
                const subjectUserId = parsed.userId;
                const matches = subjectEmail === user.email.toLowerCase() || subjectUserId === user.id;
                if (matches) {
                    consents.push({ key: row.key, createdAt: row.createdAt, updatedAt: row.updatedAt, ...parsed });
                }
            }
            catch {
            }
        }
        return consents;
    }
    async eraseUser(user, meta, initiatorId) {
        if (user.status === 'erased') {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.CONFLICT, 'This account has already been erased.', common_1.HttpStatus.CONFLICT);
        }
        await this.tenantScope.withTenant(user.schoolId, async (manager) => {
            const teachers = await manager.getRepository(teacher_entity_1.Teacher).find({ where: { userId: user.id }, withDeleted: true });
            const teacherIds = teachers.map((t) => t.id);
            if (teacherIds.length) {
                await manager.getRepository(biometric_profile_entity_1.BiometricProfile).delete({ teacherId: (0, typeorm_2.In)(teacherIds) });
            }
            await manager.getRepository(refresh_token_entity_1.RefreshToken).delete({ userId: user.id });
            await manager.getRepository(user_entity_1.User).update(user.id, {
                email: `${user.id}${ERASED_EMAIL_SUFFIX}`,
                phone: null,
                firstName: 'Erased',
                lastName: 'User',
                status: 'erased',
            });
            await manager.getRepository(system_setting_entity_1.SystemSetting).save(manager.getRepository(system_setting_entity_1.SystemSetting).create({
                schoolId: user.schoolId,
                key: `erasure:${user.id}`,
                value: JSON.stringify({
                    userId: user.id,
                    erasedAt: new Date().toISOString(),
                    requestedBy: initiatorId,
                    type: 'erasure',
                    version: '1',
                    document: NDPA_CONSENT_DOCUMENT,
                }),
            }));
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
    assertTenantScope(actor, target) {
        if (actor.role === types_1.RoleName.SUPER_ADMIN)
            return;
        if (target.schoolId !== actor.schoolId) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.TENANT_ACCESS_DENIED, 'This resource belongs to another school.', common_1.HttpStatus.FORBIDDEN);
        }
    }
};
exports.DataSubjectService = DataSubjectService;
exports.DataSubjectService = DataSubjectService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        tenant_scope_service_1.TenantScopeService,
        audit_service_1.AuditService])
], DataSubjectService);
const CONSENT_KEY_PREFIX = 'consent:';
function userDto(u) {
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
function teacherDto(t) {
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
function biometricMetaDto(b) {
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
//# sourceMappingURL=data-subject.service.js.map