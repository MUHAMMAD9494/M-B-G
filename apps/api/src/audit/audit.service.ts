import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface AuditInput {
  action: string;
  actorId?: string | null;
  schoolId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Append-oriented audit trail. Records immutable events and intentionally never
 * stores secrets, tokens, or biometric payloads.
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  record(input: AuditInput): Promise<AuditLog> {
    return this.repo.save(
      this.repo.create({
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
      }),
    );
  }

  async query(params: {
    schoolId?: string | null;
    page: number;
    limit: number;
    action?: string;
    entityType?: string;
    from?: Date;
    to?: Date;
  }) {
    const qb = this.repo.createQueryBuilder('a').orderBy('a.timestamp', 'DESC');
    if (params.schoolId) qb.andWhere('a."schoolId" = :sid', { sid: params.schoolId });
    if (params.action) qb.andWhere('a.action = :action', { action: params.action });
    if (params.entityType) qb.andWhere('a."entityType" = :et', { et: params.entityType });
    if (params.from) qb.andWhere('a.timestamp >= :from', { from: params.from });
    if (params.to) {
      const to = new Date(params.to); to.setHours(23, 59, 59, 999);
      qb.andWhere('a.timestamp <= :to', { to });
    }
    const [data, total] = await qb.skip((params.page - 1) * params.limit).take(params.limit).getManyAndCount();
    return { data, meta: { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit) } };
  }
}
