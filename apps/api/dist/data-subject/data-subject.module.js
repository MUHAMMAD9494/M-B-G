"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSubjectModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../entities/user.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const attendance_event_entity_1 = require("../entities/attendance-event.entity");
const biometric_profile_entity_1 = require("../entities/biometric-profile.entity");
const notification_preference_entity_1 = require("../entities/notification-preference.entity");
const system_setting_entity_1 = require("../entities/system-setting.entity");
const refresh_token_entity_1 = require("../entities/refresh-token.entity");
const data_subject_service_1 = require("./data-subject.service");
const data_subject_controller_1 = require("./data-subject.controller");
const tenant_scope_service_1 = require("../common/tenant-scope.service");
const audit_module_1 = require("../audit/audit.module");
let DataSubjectModule = class DataSubjectModule {
};
exports.DataSubjectModule = DataSubjectModule;
exports.DataSubjectModule = DataSubjectModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                teacher_entity_1.Teacher,
                attendance_event_entity_1.AttendanceEvent,
                biometric_profile_entity_1.BiometricProfile,
                notification_preference_entity_1.NotificationPreference,
                system_setting_entity_1.SystemSetting,
                refresh_token_entity_1.RefreshToken,
            ]),
            audit_module_1.AuditModule,
        ],
        providers: [data_subject_service_1.DataSubjectService, tenant_scope_service_1.TenantScopeService],
        controllers: [data_subject_controller_1.DataSubjectController],
    })
], DataSubjectModule);
//# sourceMappingURL=data-subject.module.js.map