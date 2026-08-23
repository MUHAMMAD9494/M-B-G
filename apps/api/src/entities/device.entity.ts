import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { DeviceStatus } from '@nexora/types';
import { BaseEntity } from '../common/base.entity';
import { School } from './school.entity';
import { User } from './user.entity';

@Entity('devices')
@Index('idx_devices_school', ['schoolId'])
export class Device extends BaseEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId: string | null;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'device_identifier', type: 'varchar', length: 200 })
  deviceIdentifier: string;

  @Column({ name: 'device_type', type: 'varchar', length: 50, nullable: true })
  deviceType: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  platform: string | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.ACTIVE })
  status: DeviceStatus;
}
