import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '../entities/school.entity';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { ErrorCodes } from '../common/error-codes';
import { UpdateSchoolDto } from './dto/schools.dto';
import { AuthUser } from '@nexora/types';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly schools: Repository<School>,
    private readonly audit: AuditService,
  ) {}

  async getMine(actor: AuthUser): Promise<School> {
    if (!actor.schoolId) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'This account is not attached to a school.', HttpStatus.NOT_FOUND);
    }
    const school = await this.schools.findOne({ where: { id: actor.schoolId } });
    if (!school) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'School not found.', HttpStatus.NOT_FOUND);
    }
    return school;
  }

  async updateMine(actor: AuthUser, dto: UpdateSchoolDto, meta: { ip: string | null; userAgent: string | null }): Promise<School> {
    const school = await this.getMine(actor);
    const oldValues = { name: school.name, timezone: school.timezone, lateThresholdMinutes: school.lateThresholdMinutes };

    if (dto.name !== undefined) school.name = dto.name;
    if (dto.logoUrl !== undefined) school.logoUrl = dto.logoUrl;
    if (dto.address !== undefined) school.address = dto.address;
    if (dto.phone !== undefined) school.phone = dto.phone;
    if (dto.email !== undefined) school.email = dto.email;
    if (dto.timezone !== undefined) school.timezone = dto.timezone;
    if (dto.workingDays !== undefined) school.workingDays = dto.workingDays;
    if (dto.lateThresholdMinutes !== undefined) school.lateThresholdMinutes = dto.lateThresholdMinutes;
    if (dto.earlyDepartureThresholdMinutes !== undefined) school.earlyDepartureThresholdMinutes = dto.earlyDepartureThresholdMinutes;

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
}
