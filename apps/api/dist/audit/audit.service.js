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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_log_entity_1 = require("../entities/audit-log.entity");
let AuditService = class AuditService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    record(input) {
        return this.repo.save(this.repo.create({
            action: input.action,
            actorId: input.actorId ?? null,
            schoolId: input.schoolId ?? null,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            oldValue: input.oldValue ?? null,
            newValue: input.newValue ?? null,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
            timestamp: new Date(),
        }));
    }
    async query(params) {
        const qb = this.repo.createQueryBuilder('a').orderBy('a.timestamp', 'DESC');
        if (params.schoolId)
            qb.andWhere('a."schoolId" = :sid', { sid: params.schoolId });
        if (params.action)
            qb.andWhere('a.action = :action', { action: params.action });
        if (params.entityType)
            qb.andWhere('a."entityType" = :et', { et: params.entityType });
        if (params.from)
            qb.andWhere('a.timestamp >= :from', { from: params.from });
        if (params.to) {
            const to = new Date(params.to);
            to.setHours(23, 59, 59, 999);
            qb.andWhere('a.timestamp <= :to', { to });
        }
        const [data, total] = await qb.skip((params.page - 1) * params.limit).take(params.limit).getManyAndCount();
        return { data, meta: { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit) } };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditService);
//# sourceMappingURL=audit.service.js.map