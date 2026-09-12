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
exports.SchoolsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const school_entity_1 = require("../entities/school.entity");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app-exception");
const error_codes_1 = require("../common/error-codes");
let SchoolsService = class SchoolsService {
    schools;
    audit;
    constructor(schools, audit) {
        this.schools = schools;
        this.audit = audit;
    }
    async getMine(actor) {
        if (!actor.schoolId) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'This account is not attached to a school.', common_1.HttpStatus.NOT_FOUND);
        }
        const school = await this.schools.findOne({ where: { id: actor.schoolId } });
        if (!school) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'School not found.', common_1.HttpStatus.NOT_FOUND);
        }
        return school;
    }
    async updateMine(actor, dto, meta) {
        const school = await this.getMine(actor);
        const oldValues = { name: school.name, timezone: school.timezone, lateThresholdMinutes: school.lateThresholdMinutes };
        if (dto.name !== undefined)
            school.name = dto.name;
        if (dto.logoUrl !== undefined)
            school.logoUrl = dto.logoUrl;
        if (dto.address !== undefined)
            school.address = dto.address;
        if (dto.phone !== undefined)
            school.phone = dto.phone;
        if (dto.email !== undefined)
            school.email = dto.email;
        if (dto.timezone !== undefined)
            school.timezone = dto.timezone;
        if (dto.workingDays !== undefined)
            school.workingDays = dto.workingDays;
        if (dto.lateThresholdMinutes !== undefined)
            school.lateThresholdMinutes = dto.lateThresholdMinutes;
        if (dto.earlyDepartureThresholdMinutes !== undefined)
            school.earlyDepartureThresholdMinutes = dto.earlyDepartureThresholdMinutes;
        const saved = await this.schools.save(school);
        await this.audit.record({
            action: 'SETTINGS_CHANGED',
            actorId: actor.id,
            schoolId: saved.id,
            entityType: 'school',
            entityId: saved.id,
            oldValue: oldValues,
            newValue: { name: saved.name, timezone: saved.timezone, lateThresholdMinutes: saved.lateThresholdMinutes },
            ...meta,
        });
        return saved;
    }
};
exports.SchoolsService = SchoolsService;
exports.SchoolsService = SchoolsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(school_entity_1.School)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        audit_service_1.AuditService])
], SchoolsService);
//# sourceMappingURL=schools.service.js.map