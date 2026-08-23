import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { BiometricProfile } from '../entities/biometric-profile.entity';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { ErrorCodes } from '../common/error-codes';
import { AuthUser } from '@nexora/types';

/**
 * BiometricProvider interface — V1 ships a dev-only adapter that uses SHA-256
 * hashes as pseudo-embeddings. This is NOT production biometric verification.
 * The interface is designed so InsightFace, ONNX, or any real engine can be
 * swapped in without changing the attendance flow.
 */
export interface BiometricProvider {
  enroll(imageData: string): Promise<string>; // returns embedding hash
  verify(embeddingHash: string, imageData: string): Promise<boolean>;
  livenessCheck(challenge: string, response: string): Promise<boolean>;
  deleteEnrollment(embeddingHash: string): Promise<void>;
}

/**
 * DevBiometricProvider — clearly labeled as development-only.
 * Uses SHA-256 of the image data as a "pseudo-embedding". Never use in
 * production for actual identity verification.
 */
export class DevBiometricProvider implements BiometricProvider {
  async enroll(imageData: string): Promise<string> {
    return createHash('sha256').update(`dev-enroll:${imageData}`).digest('hex');
  }
  async verify(embeddingHash: string, imageData: string): Promise<boolean> {
    const hash = createHash('sha256').update(`dev-enroll:${imageData}`).digest('hex');
    return hash === embeddingHash;
  }
  async livenessCheck(_challenge: string, _response: string): Promise<boolean> {
    return true; // Dev mode always passes.
  }
  async deleteEnrollment(_embeddingHash: string): Promise<void> {}
}

@Injectable()
export class BiometricService {
  private provider: BiometricProvider;

  constructor(
    @InjectRepository(BiometricProfile)
    private readonly profiles: Repository<BiometricProfile>,
    private readonly audit: AuditService,
  ) {
    this.provider = new DevBiometricProvider();
  }

  async enroll(actor: AuthUser, teacherId: string, imageData: string, meta: { ip: string | null; userAgent: string | null }) {
    const embedding = await this.provider.enroll(imageData);
    const profile = this.profiles.create({
      schoolId: actor.schoolId!,
      teacherId,
      providerType: 'dev',
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

  async list(actor: AuthUser) {
    const qb = this.profiles.createQueryBuilder('p').orderBy('p.createdAt', 'DESC');
    if (actor.schoolId) qb.andWhere('p.schoolId = :sid', { sid: actor.schoolId });
    return qb.getMany();
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
