"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../entities/user.entity");
const refresh_token_entity_1 = require("../entities/refresh-token.entity");
const password_service_1 = require("./password.service");
const token_service_1 = require("./token.service");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const audit_module_1 = require("../audit/audit.module");
const rbac_module_1 = require("../rbac/rbac.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, refresh_token_entity_1.RefreshToken]),
            jwt_1.JwtModule.registerAsync({
                useFactory: () => ({
                    secret: process.env.JWT_SECRET ?? 'dev_access_secret_change_me_00000000000000000000000000000000',
                    signOptions: { expiresIn: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10) },
                }),
            }),
            audit_module_1.AuditModule,
            rbac_module_1.RbacModule,
        ],
        providers: [password_service_1.PasswordService, token_service_1.TokenService, auth_service_1.AuthService],
        controllers: [auth_controller_1.AuthController],
        exports: [password_service_1.PasswordService, token_service_1.TokenService, jwt_1.JwtModule],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map