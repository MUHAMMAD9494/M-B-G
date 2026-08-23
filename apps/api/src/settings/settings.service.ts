import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../entities/system-setting.entity';
import { AuditService } from '../audit/audit.service';
import { AuthUser, RoleName } from '@nexora/types';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting) private readonly settings: Repository<SystemSetting>,
    private readonly audit: AuditService,
  ) {}

  async get(actor: AuthUser, key?: string) {
    const qb = this.settings.createQueryBuilder('s');
    if (actor.role !== RoleName.SUPER_ADMIN) qb.andWhere('s.schoolId = :sid', { sid: actor.schoolId });
    if (key) qb.andWhere('s.key = :key', { key });
    return qb.getMany();
  }

  async set(actor: AuthUser, key: string, value: string, meta: { ip: string | null; userAgent: string | null }) {
    const where: { key: string; schoolId?: string } = { key };
    if (actor.schoolId) where.schoolId = actor.schoolId;

    let setting = await this.settings.findOne({ where });
    if (setting) {
      setting.value = value;
    } else {
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
}
