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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const auth_dto_1 = require("./dto/auth.dto");
const public_decorator_1 = require("../common/public.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const isProd = process.env.NODE_ENV === 'production';
const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;
const cookieBase = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    domain: cookieDomain,
};
function setAuthCookies(res, accessToken, refreshToken) {
    res.cookie('nse_access', accessToken, {
        ...cookieBase,
        maxAge: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10) * 1000,
    });
    res.cookie('nse_refresh', refreshToken, {
        ...cookieBase,
        maxAge: parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10) * 1000,
    });
}
function clearAuthCookies(res) {
    res.cookie('nse_access', '', { ...cookieBase, maxAge: 0 });
    res.cookie('nse_refresh', '', { ...cookieBase, maxAge: 0 });
}
let AuthController = class AuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    async login(dto, req, res) {
        const result = await this.auth.login(dto, (0, auth_service_1.requestMeta)(req));
        setAuthCookies(res, result.accessToken, result.refreshToken);
        return { user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn };
    }
    async refresh(req, res, body) {
        const token = req.cookies?.nse_refresh ?? body?.refreshToken;
        const result = await this.auth.refresh(token, (0, auth_service_1.requestMeta)(req));
        setAuthCookies(res, result.accessToken, result.refreshToken);
        return { accessToken: result.accessToken, expiresIn: result.expiresIn };
    }
    async logout(req, res, actor) {
        await this.auth.logout(req.cookies?.nse_refresh, actor, (0, auth_service_1.requestMeta)(req));
        clearAuthCookies(res);
        return {};
    }
    async me(actor) {
        return actor;
    }
    async changePassword(dto, req, actor) {
        await this.auth.changePassword(actor, dto, (0, auth_service_1.requestMeta)(req));
        return {};
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60000, limit: 10 } }),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Login with email and password' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Rotate refresh token and issue a new access token' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke the refresh token and clear cookies' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Current authenticated user with permissions' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Change own password (revokes all sessions)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.ChangePasswordDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map