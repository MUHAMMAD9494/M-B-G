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
exports.GeofencingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const geofencing_service_1 = require("./geofencing.service");
const geofencing_dto_1 = require("./dto/geofencing.dto");
const permissions_decorator_1 = require("../common/permissions.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
let GeofencingController = class GeofencingController {
    geofencing;
    constructor(geofencing) {
        this.geofencing = geofencing;
    }
    meta(req) {
        return {
            ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        };
    }
    async list(actor) {
        return this.geofencing.list(actor);
    }
    async create(actor, dto, req) {
        return this.geofencing.create(actor, dto, this.meta(req));
    }
    async update(actor, id, dto, req) {
        return this.geofencing.update(actor, id, dto, this.meta(req));
    }
};
exports.GeofencingController = GeofencingController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('settings.read'),
    (0, swagger_1.ApiOperation)({ summary: 'List geofences for the school' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GeofencingController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('settings.update'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a geofence (deactivates existing ones)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, geofencing_dto_1.CreateGeofenceDto, Object]),
    __metadata("design:returntype", Promise)
], GeofencingController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.Permissions)('settings.update'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a geofence' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, geofencing_dto_1.UpdateGeofenceDto, Object]),
    __metadata("design:returntype", Promise)
], GeofencingController.prototype, "update", null);
exports.GeofencingController = GeofencingController = __decorate([
    (0, swagger_1.ApiTags)('geofences'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('geofences'),
    __metadata("design:paramtypes", [geofencing_service_1.GeofencingService])
], GeofencingController);
//# sourceMappingURL=geofencing.controller.js.map