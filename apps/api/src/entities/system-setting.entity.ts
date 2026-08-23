import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('system_settings')
@Index('idx_settings_school_key', ['schoolId', 'key'], { unique: true })
export class SystemSetting extends BaseEntity {
  /** Null for platform-global settings. */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId: string | null;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;
}
