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
exports.BiometricService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const biometric_profile_entity_1 = require("../entities/biometric-profile.entity");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app-exception");
const error_codes_1 = require("../common/error-codes");
const configuration_1 = require("../config/configuration");
const biometric_provider_1 = require("./providers/biometric.provider");
let BiometricService = class BiometricService {
    profiles;
    audit;
    provider;
    providerType;
    constructor(profiles, audit) {
        this.profiles = profiles;
        this.audit = audit;
        const cfg = (0, configuration_1.loadConfiguration)();
        if (cfg.nodeEnv === 'production' && cfg.biometricProvider !== 'dev') {
            throw new Error('No production biometric provider is configured. ' +
                'BIOMETRIC_PROVIDER must point to a real verification engine; the dev adapter is blocked in production.');
        }
        this.provider = new biometric_provider_1.DevBiometricProvider();
        this.providerType = cfg.biometricProvider;
    }
    async enroll(actor, teacherId, imageData, meta) {
        const embedding = await this.provider.enroll(imageData);
        const profile = this.profiles.create({
            schoolId: actor.schoolId,
            teacherId,
            providerType: this.providerType,
            embeddingHash: embedding,
            status: 'ACTIVE',
            enrolledBy: actor.id,
        });
        const saved = await this.profiles.save(profile);
        await this.audit.record({
            action: 'BIOMETRIC_ENROLLED', actorId: actor.id, schoolId: actor.schoolId,
            entityType: 'biometric_profile', entityId: saved.id,
            ...meta,
        });
        return { id: saved.id, status: saved.status, providerType: saved.providerType };
    }
    async verify(teacherId, imageData) {
        const profile = await this.profiles.findOne({ where: { teacherId, status: 'ACTIVE' } });
        if (!profile)
            return { verified: false, reason: 'No active biometric enrollment found.' };
        const ok = await this.provider.verify(profile.embeddingHash, imageData);
        return { verified: ok, reason: ok ? null : 'Verification failed.' };
    }
    async livenessChallenge() {
        return (0, biometric_provider_1.generateLivenessChallenge)();
    }
    async livenessCheck(challenge, response) {
        return this.provider.livenessCheck(challenge, response);
    }
    async list(actor) {
        const qb = this.profiles.createQueryBuilder('p').orderBy('p.createdAt', 'DESC');
        if (actor.schoolId)
            qb.andWhere('p.schoolId = :sid', { sid: actor.schoolId });
        const rows = await qb.getMany();
        return rows.map((p) => ({
            id: p.id,
            teacherId: p.teacherId,
            providerType: p.providerType,
            status: p.status,
            createdAt: p.createdAt,
        }));
    }
    async delete(actor, id, meta) {
        const profile = await this.profiles.findOne({ where: { id } });
        if (!profile)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, '', common_1.HttpStatus.NOT_FOUND);
        if (actor.role !== 'SUPER_ADMIN' && profile.schoolId !== actor.schoolId)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.TENANT_ACCESS_DENIED, '', common_1.HttpStatus.FORBIDDEN);
        await this.provider.deleteEnrollment(profile.embeddingHash);
        await this.profiles.update(id, { status: 'DELETED' });
        await this.audit.record({ action: 'BIOMETRIC_DELETED', actorId: actor.id, schoolId: profile.schoolId, entityType: 'biometric_profile', entityId: id, ...meta });
        return {};
    }
};
exports.BiometricService = BiometricService;
exports.BiometricService = BiometricService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(biometric_profile_entity_1.BiometricProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        audit_service_1.AuditService])
], BiometricService);
//# sourceMappingURL=biometric.service.js.map