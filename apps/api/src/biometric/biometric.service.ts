import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiometricProfile } from '../entities/biometric-profile.entity';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { ErrorCodes } from '../common/error-codes';
import { loadConfiguration } from '../config/configuration';
import { AuthUser } from '@nexora/types';
import {
  BiometricProvider,
  DevBiometricProvider,
  generateLivenessChallenge,
  LivenessChallenge,
  LivenessResult,
} from './providers/biometric.provider';

@Injectable()
export class BiometricService {
  private provider: BiometricProvider;
  private readonly providerType: string;

  constructor(
    @InjectRepository(BiometricProfile)
    private readonly profiles: Repository<BiometricProfile>,
    private readonly audit: AuditService,
  ) {
    // Hard production gate: the dev adapter (SHA-256 "pseudo-embedding",
    // liveness always passes) must NEVER run in production. A real provider
    // (InsightFace/ONNX/cloud/device-based) must be configured explicitly;
    // until one exists, production refuses to boot rather than silently
    // presenting dev verification as identity.
    const cfg = loadConfiguration();
    if (cfg.nodeEnv === 'production') {
      throw new Error(
        'No production biometric provider is configured. ' +
          'BIOMETRIC_PROVIDER must point to a real verification engine; the dev adapter is blocked in production.',
      );
    }
    this.provider = new DevBiometricProvider();
    this.providerType = cfg.biometricProvider;
  }

  async enroll(actor: AuthUser, teacherId: string, imageData: string, meta: { ip: string | null; userAgent: string | null }) {
    const embedding = await this.provider.enroll(imageData);
    const profile = this.profiles.create({
      schoolId: actor.schoolId!,
      teacherId,
      providerType: this.providerType,
      embeddingHash: embedding,
      status: 'ACTIVE',
      enrolledBy: actor.id,
    });
    const saved = await this.profiles.save(profile);
    await this.audit.record({
      action: 'BIOMETRIC_ENROLLED', actorId: actor.id, schoolId: actor.schoolId!,
      entityType: 'biometric_profile', entityId: saved.id,
      ...meta,
    });
    return { id: saved.id, status: saved.status, providerType: saved.providerType };
  }

  async verify(teacherId: string, imageData: string) {
    const profile = await this.profiles.findOne({ where: { teacherId, status: 'ACTIVE' } });
    if (!profile) return { verified: false, reason: 'No active biometric enrollment found.' };
    const ok = await this.provider.verify(profile.embeddingHash, imageData);
    return { verified: ok, reason: ok ? null : 'Verification failed.' };
  }

  /** Issue a randomized liveness micro-challenge (anti-spoofing). */
  async livenessChallenge(): Promise<LivenessChallenge> {
    return generateLivenessChallenge();
  }

  /** Run a liveness check against an issued challenge + client response. */
  async livenessCheck(challenge: LivenessChallenge, response: string): Promise<LivenessResult> {
    return this.provider.livenessCheck(challenge, response);
  }

  async list(actor: AuthUser) {
    const qb = this.profiles.createQueryBuilder('p').orderBy('p.createdAt', 'DESC');
    if (actor.schoolId) qb.andWhere('p.schoolId = :sid', { sid: actor.schoolId });
    const rows = await qb.getMany();
    // Never expose embedding hashes/templates through ordinary API responses.
    return rows.map((p) => ({
      id: p.id,
      teacherId: p.teacherId,
      providerType: p.providerType,
      status: p.status,
      createdAt: p.createdAt,
    }));
  }

  async delete(actor: AuthUser, id: string, meta: { ip: string | null; userAgent: string | null }) {
    const profile = await this.profiles.findOne({ where: { id } });
    if (!profile) throw new AppException(ErrorCodes.NOT_FOUND, '', HttpStatus.NOT_FOUND);
    if (actor.role !== 'SUPER_ADMIN' && profile.schoolId !== actor.schoolId) throw new AppException(ErrorCodes.TENANT_ACCESS_DENIED, '', HttpStatus.FORBIDDEN);
    await this.provider.deleteEnrollment(profile.embeddingHash);
    await this.profiles.update(id, { status: 'DELETED' });
    await this.audit.record({ action: 'BIOMETRIC_DELETED', actorId: actor.id, schoolId: profile.schoolId, entityType: 'biometric_profile', entityId: id, ...meta });
    return {};
  }
}
