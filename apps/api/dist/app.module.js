"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const entities_1 = require("./entities");
const configuration_1 = require("./config/configuration");
const rbac_module_1 = require("./rbac/rbac.module");
const audit_module_1 = require("./audit/audit.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const schools_module_1 = require("./schools/schools.module");
const branches_module_1 = require("./branches/branches.module");
const teachers_module_1 = require("./teachers/teachers.module");
const attendance_module_1 = require("./attendance/attendance.module");
const geofencing_module_1 = require("./geofencing/geofencing.module");
const biometric_module_1 = require("./biometric/biometric.module");
const devices_module_1 = require("./devices/devices.module");
const reports_module_1 = require("./reports/reports.module");
const settings_module_1 = require("./settings/settings.module");
const health_module_1 = require("./health/health.module");
const notifications_module_1 = require("./notifications/notifications.module");
const onboarding_module_1 = require("./onboarding/onboarding.module");
const data_subject_module_1 = require("./data-subject/data-subject.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const permissions_guard_1 = require("./common/guards/permissions.guard");
const request_logging_interceptor_1 = require("./common/request-logging.interceptor");
const core_2 = require("@nestjs/core");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'], load: [configuration_1.loadConfiguration] }),
            typeorm_1.TypeOrmModule.forRootAsync({
                useFactory: () => {
                    const cfg = (0, configuration_1.loadConfiguration)();
                    return {
                        type: 'postgres',
                        url: cfg.appDatabaseUrl ?? cfg.databaseUrl,
                        entities: entities_1.entities,
                        synchronize: false,
                        logging: cfg.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
                        extra: { max: 10, idleTimeoutMillis: 30000 },
                    };
                },
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'standard',
                    ttl: 60000,
                    limit: 300,
                },
                {
                    name: 'auth',
                    ttl: 60000,
                    limit: 10,
                },
            ]),
            rbac_module_1.RbacModule,
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            schools_module_1.SchoolsModule,
            branches_module_1.BranchesModule,
            teachers_module_1.TeachersModule,
            attendance_module_1.AttendanceModule,
            geofencing_module_1.GeofencingModule,
            biometric_module_1.BiometricModule,
            devices_module_1.DevicesModule,
            reports_module_1.ReportsModule,
            settings_module_1.SettingsModule,
            health_module_1.HealthModule,
            notifications_module_1.NotificationsModule,
            onboarding_module_1.OnboardingModule,
            data_subject_module_1.DataSubjectModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: permissions_guard_1.PermissionsGuard },
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_2.APP_INTERCEPTOR, useClass: request_logging_interceptor_1.RequestLoggingInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map