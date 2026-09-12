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
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const token_service_1 = require("../../auth/token.service");
const public_decorator_1 = require("../public.decorator");
const types_1 = require("@nexora/types");
let JwtAuthGuard = class JwtAuthGuard {
    tokens;
    reflector;
    dataSource;
    constructor(tokens, reflector, dataSource) {
        this.tokens = tokens;
        this.reflector = reflector;
        this.dataSource = dataSource;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const token = this.extractToken(request);
        if (!token) {
            throw new common_1.UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
        }
        let payload;
        try {
            payload = await this.tokens.verifyAccessToken(token);
        }
        catch {
            throw new common_1.UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Session expired. Please sign in again.' });
        }
        if (payload.type !== 'access') {
            throw new common_1.UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid token type.' });
        }
        const rows = await this.dataSource.query('SELECT status, role, school_id FROM users WHERE id = $1', [payload.sub]);
        const row = rows[0];
        if (!row ||
            row.status !== types_1.UserStatus.ACTIVE ||
            row.role !== payload.role ||
            (row.school_id ?? null) !== (payload.schoolId ?? null)) {
            throw new common_1.UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Session expired. Please sign in again.' });
        }
        request.user = {
            id: payload.sub,
            schoolId: payload.schoolId,
            email: payload.email,
            phone: payload.phone ?? null,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role,
            status: payload.status,
            permissions: payload.permissions,
        };
        return true;
    }
    extractToken(request) {
        const header = request.headers?.authorization;
        if (header?.startsWith('Bearer '))
            return header.slice(7);
        return request.cookies?.nse_access ?? null;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [token_service_1.TokenService,
        core_1.Reflector,
        typeorm_2.DataSource])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map