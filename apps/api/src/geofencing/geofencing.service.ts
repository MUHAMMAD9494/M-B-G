import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Geofence } from '../entities/geofence.entity';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { ErrorCodes } from '../common/error-codes';
import { CreateGeofenceDto, UpdateGeofenceDto } from './dto/geofencing.dto';
import { AuthUser } from '@nexora/types';

@Injectable()
export class GeofencingService {
  constructor(
    @InjectRepository(Geofence) private readonly geofences: Repository<Geofence>,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser) {
    const qb = this.geofences.createQueryBuilder('g').orderBy('g.createdAt', 'DESC');
    if (actor.schoolId) qb.andWhere('g.schoolId = :sid', { sid: actor.schoolId });
    return qb.getMany();
  }

  async create(actor: AuthUser, dto: CreateGeofenceDto, meta: { ip: string | null; userAgent: string | null }) {
    // Deactivate existing geofences for this school
    if (actor.schoolId) {
      await this.geofences.update({ schoolId: actor.schoolId }, { active: false });
    }
    const geo = this.geofences.create({
      schoolId: actor.schoolId!,
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

  async update(actor: AuthUser, id: string, dto: UpdateGeofenceDto, meta: { ip: string | null; userAgent: string | null }) {
    const geo = await this.geofences.findOne({ where: { id } });
    if (!geo) throw new AppException(ErrorCodes.NOT_FOUND, 'Geofence not found.', HttpStatus.NOT_FOUND);
    if (actor.role !== 'SUPER_ADMIN' && geo.schoolId !== actor.schoolId) throw new AppException(ErrorCodes.TENANT_ACCESS_DENIED, '', HttpStatus.FORBIDDEN);
    Object.assign(geo, dto);
    const saved = await this.geofences.save(geo);
    await this.audit.record({ action: 'GEOFENCE_CHANGED', actorId: actor.id, schoolId: geo.schoolId, entityType: 'geofence', entityId: id, ...meta });
    return saved;
  }
}
