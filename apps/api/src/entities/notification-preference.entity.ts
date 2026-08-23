import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('notification_preferences')
@Index('idx_notif_user', ['userId'])
export class NotificationPreference extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId: string | null;

  @Column({ type: 'varchar', length: 40 })
  channel: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
