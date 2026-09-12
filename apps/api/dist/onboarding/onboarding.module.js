"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const school_entity_1 = require("../entities/school.entity");
const branch_entity_1 = require("../entities/branch.entity");
const user_entity_1 = require("../entities/user.entity");
const system_setting_entity_1 = require("../entities/system-setting.entity");
const onboarding_service_1 = require("./onboarding.service");
const onboarding_controller_1 = require("./onboarding.controller");
const password_service_1 = require("../auth/password.service");
const audit_module_1 = require("../audit/audit.module");
let OnboardingModule = class OnboardingModule {
};
exports.OnboardingModule = OnboardingModule;
exports.OnboardingModule = OnboardingModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([school_entity_1.School, branch_entity_1.Branch, user_entity_1.User, system_setting_entity_1.SystemSetting]),
            audit_module_1.AuditModule,
        ],
        providers: [onboarding_service_1.OnboardingService, password_service_1.PasswordService],
        controllers: [onboarding_controller_1.OnboardingController],
        exports: [onboarding_service_1.OnboardingService],
    })
], OnboardingModule);
//# sourceMappingURL=onboarding.module.js.map