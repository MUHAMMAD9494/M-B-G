import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { AuthUser, DeviceStatus } from '@nexora/types';

@Injectable()
export class DevicesService {
  constructor(@InjectRepository(Device) private readonly devices: Repository<Device>) {}

  async register(actor: AuthUser, dto: { deviceIdentifier: string; deviceType: string; platform: string }) {
    const existing = await this.devices.findOne({
      where: { userId: actor.id, deviceIdentifier: dto.deviceIdentifier },
    });
    if (existing) {
      existing.lastSeenAt = new Date();
      existing.platform = dto.platform;
      existing.deviceType = dto.deviceType;
      return this.devices.save(existing);
    }
    const device = this.devices.create({
      schoolId: actor.schoolId,
      userId: actor.id,
      deviceIdentifier: dto.deviceIdentifier,
      deviceType: dto.deviceType,
      platform: dto.platform,
      status: DeviceStatus.ACTIVE,
      lastSeenAt: new Date(),
    });
    return this.devices.save(device);
  }

  async list(actor: AuthUser) {
    const qb = this.devices.createQueryBuilder('d').orderBy('d.lastSeenAt', 'DESC');
    if (actor.schoolId) qb.andWhere('d.schoolId = :sid', { sid: actor.schoolId });
    return qb.getMany();
  }
}
