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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const public_decorator_1 = require("../common/public.decorator");
let HealthController = class HealthController {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async check() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }
    async database() {
        try {
            await this.dataSource.query('SELECT 1');
            return { status: 'ok', database: 'connected' };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { status: 'error', database: 'disconnected', message: msg };
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Health check' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('database'),
    (0, swagger_1.ApiOperation)({ summary: 'Database connectivity check' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "database", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('health'),
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], HealthController);
//# sourceMappingURL=health.controller.js.map