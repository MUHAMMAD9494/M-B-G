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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const system_setting_entity_1 = require("../entities/system-setting.entity");
const audit_service_1 = require("../audit/audit.service");
const types_1 = require("@nexora/types");
let SettingsService = class SettingsService {
    settings;
    audit;
    constructor(settings, audit) {
        this.settings = settings;
        this.audit = audit;
    }
    async get(actor, key) {
        const qb = this.settings.createQueryBuilder('s');
        if (actor.role !== types_1.RoleName.SUPER_ADMIN)
            qb.andWhere('s.schoolId = :sid', { sid: actor.schoolId });
        if (key)
            qb.andWhere('s.key = :key', { key });
        return qb.getMany();
    }
    async set(actor, key, value, meta) {
        const where = { key };
        if (actor.schoolId)
            where.schoolId = actor.schoolId;
        let setting = await this.settings.findOne({ where });
        if (setting) {
            setting.value = value;
        }
        else {
            setting = this.settings.create({ key, value, schoolId: actor.schoolId });
        }
        const saved = await this.settings.save(setting);
        await this.audit.record({
            action: 'SETTINGS_CHANGED',
            actorId: actor.id,
            schoolId: actor.schoolId,
            entityType: 'system_setting',
            entityId: saved.id,
            newValue: { key, value },
            ...meta,
        });
        return saved;
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(system_setting_entity_1.SystemSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        audit_service_1.AuditService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map