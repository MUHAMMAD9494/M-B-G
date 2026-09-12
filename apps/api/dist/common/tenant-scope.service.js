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
exports.TenantScopeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let TenantScopeService = class TenantScopeService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async withTenant(schoolId, fn) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            if (schoolId) {
                await queryRunner.query(`SELECT set_config('app.school_id', $1, true)`, [schoolId]);
                await queryRunner.query(`SELECT set_config('app.is_super', 'false', true)`);
            }
            else {
                await queryRunner.query(`SELECT set_config('app.school_id', '', true)`);
                await queryRunner.query(`SELECT set_config('app.is_super', 'true', true)`);
            }
            const result = await fn(queryRunner.manager);
            await queryRunner.commitTransaction();
            return result;
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
        finally {
            await queryRunner.release();
        }
    }
};
exports.TenantScopeService = TenantScopeService;
exports.TenantScopeService = TenantScopeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], TenantScopeService);
//# sourceMappingURL=tenant-scope.service.js.map