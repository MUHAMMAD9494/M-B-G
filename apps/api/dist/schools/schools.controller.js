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
exports.SchoolsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const schools_service_1 = require("./schools.service");
const schools_dto_1 = require("./dto/schools.dto");
const onboarding_service_1 = require("../onboarding/onboarding.service");
const onboarding_dto_1 = require("../onboarding/dto/onboarding.dto");
const permissions_decorator_1 = require("../common/permissions.decorator");
const public_decorator_1 = require("../common/public.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
let SchoolsController = class SchoolsController {
    schools;
    onboarding;
    constructor(schools, onboarding) {
        this.schools = schools;
        this.onboarding = onboarding;
    }
    meta(req) {
        return {
            ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        };
    }
    async selfRegister(dto, req) {
        return this.onboarding.registerSchool(dto, this.meta(req));
    }
    async getMine(actor) {
        return this.schools.getMine(actor);
    }
    async updateMine(actor, dto, req) {
        return this.schools.updateMine(actor, dto, this.meta(req));
    }
};
exports.SchoolsController = SchoolsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ auth: { ttl: 60000, limit: 10 } }),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Self-register a school (public commercial onboarding): provisions tenant, branch, owner + consent.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [onboarding_dto_1.RegisterSchoolDto, Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "selfRegister", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, permissions_decorator_1.Permissions)('school.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Get own school configuration' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "getMine", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, permissions_decorator_1.Permissions)('school.update'),
    (0, swagger_1.ApiOperation)({ summary: 'Update own school configuration' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, schools_dto_1.UpdateSchoolDto, Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "updateMine", null);
exports.SchoolsController = SchoolsController = __decorate([
    (0, swagger_1.ApiTags)('schools'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('schools'),
    __metadata("design:paramtypes", [schools_service_1.SchoolsService,
        onboarding_service_1.OnboardingService])
], SchoolsController);
//# sourceMappingURL=schools.controller.js.map