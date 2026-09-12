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
exports.BranchesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const branch_entity_1 = require("../entities/branch.entity");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app-exception");
const error_codes_1 = require("../common/error-codes");
const types_1 = require("@nexora/types");
let BranchesService = class BranchesService {
    branches;
    audit;
    constructor(branches, audit) {
        this.branches = branches;
        this.audit = audit;
    }
    async list(actor) {
        const qb = this.branches.createQueryBuilder('b').orderBy('b.name', 'ASC');
        if (actor.role !== types_1.RoleName.SUPER_ADMIN)
            qb.andWhere('b.schoolId = :sid', { sid: actor.schoolId });
        return qb.getMany();
    }
    async create(actor, dto, meta) {
        const branch = this.branches.create({
            schoolId: actor.schoolId,
            name: dto.name,
            address: dto.address ?? null,
            latitude: dto.latitude ?? null,
            longitude: dto.longitude ?? null,
            timezone: dto.timezone ?? null,
            status: types_1.BranchStatus.ACTIVE,
        });
        const saved = await this.branches.save(branch);
        await this.audit.record({
            action: 'SETTINGS_CHANGED', actorId: actor.id, schoolId: saved.schoolId,
            entityType: 'branch', entityId: saved.id,
            newValue: { name: saved.name }, ...meta,
        });
        return saved;
    }
    async update(actor, id, dto, meta) {
        const branch = await this.branches.findOne({ where: { id } });
        if (!branch)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'Branch not found.', common_1.HttpStatus.NOT_FOUND);
        if (actor.role !== types_1.RoleName.SUPER_ADMIN && branch.schoolId !== actor.schoolId)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.TENANT_ACCESS_DENIED, '', common_1.HttpStatus.FORBIDDEN);
        Object.assign(branch, dto);
        const saved = await this.branches.save(branch);
        await this.audit.record({ action: 'SETTINGS_CHANGED', actorId: actor.id, schoolId: branch.schoolId, entityType: 'branch', entityId: id, ...meta });
        return saved;
    }
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(branch_entity_1.Branch)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        audit_service_1.AuditService])
], BranchesService);
//# sourceMappingURL=branches.service.js.map