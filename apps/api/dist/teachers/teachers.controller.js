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
exports.TeachersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const teachers_service_1 = require("./teachers.service");
const teachers_dto_1 = require("./dto/teachers.dto");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
let TeachersController = class TeachersController {
    teachers;
    constructor(teachers) {
        this.teachers = teachers;
    }
    meta(req) {
        return {
            ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        };
    }
    async list(actor, query) {
        return this.teachers.list(actor, query);
    }
    async getOne(actor, id) {
        return this.teachers.getOne(actor, id);
    }
    async create(actor, dto, req) {
        return this.teachers.create(actor, dto, this.meta(req));
    }
    async update(actor, id, dto, req) {
        return this.teachers.update(actor, id, dto, this.meta(req));
    }
};
exports.TeachersController = TeachersController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('teachers.read'),
    (0, swagger_1.ApiOperation)({ summary: 'List teachers (tenant-scoped)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, teachers_dto_1.ListTeachersQueryDto]),
    __metadata("design:returntype", Promise)
], TeachersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('teachers.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single teacher by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TeachersController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('teachers.create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a teacher' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, teachers_dto_1.CreateTeacherDto, Object]),
    __metadata("design:returntype", Promise)
], TeachersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.Permissions)('teachers.update'),
    (0, swagger_1.ApiOperation)({ summary: 'Update teacher profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, teachers_dto_1.UpdateTeacherDto, Object]),
    __metadata("design:returntype", Promise)
], TeachersController.prototype, "update", null);
exports.TeachersController = TeachersController = __decorate([
    (0, swagger_1.ApiTags)('teachers'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('teachers'),
    __metadata("design:paramtypes", [teachers_service_1.TeachersService])
], TeachersController);
//# sourceMappingURL=teachers.controller.js.map