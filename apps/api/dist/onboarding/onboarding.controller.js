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
exports.OnboardingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const onboarding_service_1 = require("./onboarding.service");
const onboarding_dto_1 = require("./dto/onboarding.dto");
const public_decorator_1 = require("../common/public.decorator");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
let OnboardingController = class OnboardingController {
    onboarding;
    constructor(onboarding) {
        this.onboarding = onboarding;
    }
    meta(req) {
        return {
            ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        };
    }
    async registerSchool(dto, req) {
        return this.onboarding.registerSchool(dto, this.meta(req));
    }
    async inviteUser(actor, dto, req) {
        return this.onboarding.inviteUser(actor, dto, this.meta(req));
    }
};
exports.OnboardingController = OnboardingController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60000, limit: 10 } }),
    (0, common_1.Post)('schools'),
    (0, swagger_1.ApiOperation)({ summary: 'Self-register a school: creates tenant, Main Branch, owner account and NDPA consent record.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [onboarding_dto_1.RegisterSchoolDto, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "registerSchool", null);
__decorate([
    (0, common_1.Post)('invites'),
    (0, permissions_decorator_1.Permissions)('school.update'),
    (0, swagger_1.ApiOperation)({ summary: 'Invite a school member (creates a pending user that cannot log in until activated).' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, onboarding_dto_1.InviteUserDto, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "inviteUser", null);
exports.OnboardingController = OnboardingController = __decorate([
    (0, swagger_1.ApiTags)('onboarding'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('onboarding'),
    __metadata("design:paramtypes", [onboarding_service_1.OnboardingService])
], OnboardingController);
//# sourceMappingURL=onboarding.controller.js.map