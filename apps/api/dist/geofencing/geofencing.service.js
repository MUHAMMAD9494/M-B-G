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
exports.GeofencingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const geofence_entity_1 = require("../entities/geofence.entity");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app-exception");
const error_codes_1 = require("../common/error-codes");
let GeofencingService = class GeofencingService {
    geofences;
    audit;
    constructor(geofences, audit) {
        this.geofences = geofences;
        this.audit = audit;
    }
    async list(actor) {
        const qb = this.geofences.createQueryBuilder('g').orderBy('g.createdAt', 'DESC');
        if (actor.schoolId)
            qb.andWhere('g.schoolId = :sid', { sid: actor.schoolId });
        return qb.getMany();
    }
    async create(actor, dto, meta) {
        if (actor.schoolId) {
            await this.geofences.update({ schoolId: actor.schoolId }, { active: false });
        }
        const geo = this.geofences.create({
            schoolId: actor.schoolId,
            name: dto.name,
            latitude: dto.latitude,
            longitude: dto.longitude,
            radius: dto.radius,
            active: true,
        });
        const saved = await this.geofences.save(geo);
        await this.audit.record({
            action: 'GEOFENCE_CHANGED', actorId: actor.id, schoolId: saved.schoolId,
            entityType: 'geofence', entityId: saved.id,
            newValue: { name: saved.name, radius: saved.radius },
            ...meta,
        });
        return saved;
    }
    async update(actor, id, dto, meta) {
        const geo = await this.geofences.findOne({ where: { id } });
        if (!geo)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'Geofence not found.', common_1.HttpStatus.NOT_FOUND);
        if (actor.role !== 'SUPER_ADMIN' && geo.schoolId !== actor.schoolId)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.TENANT_ACCESS_DENIED, '', common_1.HttpStatus.FORBIDDEN);
        Object.assign(geo, dto);
        const saved = await this.geofences.save(geo);
        await this.audit.record({ action: 'GEOFENCE_CHANGED', actorId: actor.id, schoolId: geo.schoolId, entityType: 'geofence', entityId: id, ...meta });
        return saved;
    }
};
exports.GeofencingService = GeofencingService;
exports.GeofencingService = GeofencingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(geofence_entity_1.Geofence)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        audit_service_1.AuditService])
], GeofencingService);
//# sourceMappingURL=geofencing.service.js.map