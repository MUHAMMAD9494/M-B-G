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
exports.BranchesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const branches_service_1 = require("./branches.service");
const branches_dto_1 = require("./dto/branches.dto");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
let BranchesController = class BranchesController {
    branches;
    constructor(branches) {
        this.branches = branches;
    }
    meta(req) {
        return { ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
    }
    async list(actor) {
        return this.branches.list(actor);
    }
    async create(actor, dto, req) {
        return this.branches.create(actor, dto, this.meta(req));
    }
    async update(actor, id, dto, req) {
        return this.branches.update(actor, id, dto, this.meta(req));
    }
};
exports.BranchesController = BranchesController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('school.read'),
    (0, swagger_1.ApiOperation)({ summary: 'List branches' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('school.update'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a branch' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, branches_dto_1.CreateBranchDto, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.Permissions)('school.update'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a branch' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, branches_dto_1.UpdateBranchDto, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "update", null);
exports.BranchesController = BranchesController = __decorate([
    (0, swagger_1.ApiTags)('branches'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('branches'),
    __metadata("design:paramtypes", [branches_service_1.BranchesService])
], BranchesController);
//# sourceMappingURL=branches.controller.js.map