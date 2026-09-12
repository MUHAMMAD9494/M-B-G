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
exports.DataSubjectController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const data_subject_service_1 = require("./data-subject.service");
const data_subject_dto_1 = require("./dto/data-subject.dto");
const current_user_decorator_1 = require("../common/current-user.decorator");
const types_1 = require("@nexora/types");
let DataSubjectController = class DataSubjectController {
    dataSubject;
    constructor(dataSubject) {
        this.dataSubject = dataSubject;
    }
    meta(req) {
        return {
            ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        };
    }
    async exportData(actor, query) {
        if (query.user) {
            this.assertAdmin(actor);
            return this.dataSubject.exportFor(actor, query.user);
        }
        return this.dataSubject.exportSelf(actor);
    }
    async eraseData(actor, query, req) {
        const meta = this.meta(req);
        if (query.user) {
            this.assertAdmin(actor);
            await this.dataSubject.eraseFor(actor, query.user, meta);
        }
        else {
            await this.dataSubject.eraseSelf(actor, meta);
        }
    }
    assertAdmin(actor) {
        if (!actor.permissions.includes(types_1.Permission.USERS_UPDATE)) {
            throw new common_1.ForbiddenException({
                code: 'FORBIDDEN',
                message: 'You do not have permission to perform this action.',
            });
        }
    }
};
exports.DataSubjectController = DataSubjectController;
__decorate([
    (0, common_1.Get)('export'),
    (0, swagger_1.ApiOperation)({ summary: 'Export personal data (NDPA access request). ?user=<id> admin variant requires users.update.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, data_subject_dto_1.DataSubjectQueryDto]),
    __metadata("design:returntype", Promise)
], DataSubjectController.prototype, "exportData", null);
__decorate([
    (0, common_1.Post)('erasure'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Erase personal data (NDPA deletion request). ?user=<id> admin variant requires users.update.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, data_subject_dto_1.DataSubjectQueryDto, Object]),
    __metadata("design:returntype", Promise)
], DataSubjectController.prototype, "eraseData", null);
exports.DataSubjectController = DataSubjectController = __decorate([
    (0, swagger_1.ApiTags)('data-subject'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('data-subject'),
    __metadata("design:paramtypes", [data_subject_service_1.DataSubjectService])
], DataSubjectController);
//# sourceMappingURL=data-subject.controller.js.map