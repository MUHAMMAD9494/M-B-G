import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

/**
 * A school is the multi-tenant boundary. Every tenant-owned entity carries a
 * `schoolId` foreign key back to this table and is protected by RLS + app-level
 * scoping.
 */
@Entity('schools')
export class School extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 320, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 64, default: 'Africa/Lagos' })
  timezone: string;

  /** ISO weekday numbers (1=Mon..7=Sun) considered working days. */
  @Column({ name: 'working_days', type: 'jsonb', default: () => `'[1,2,3,4,5]'` })
  workingDays: number[];

  /** Minutes after expected check-in time before attendance is marked LATE. */
  @Column({ name: 'late_threshold_minutes', type: 'int', default: 15 })
  lateThresholdMinutes: number;

  /** Minutes before expected check-out time that triggers an EARLY flag. */
  @Column({ name: 'early_departure_threshold_minutes', type: 'int', default: 30 })
  earlyDepartureThresholdMinutes: number;

  /**
   * Control-plane routing metadata (refs only — NEVER credentials or school
   * attendance data). shared = platform-managed RLS-protected database;
   * dedicated = this tenant has its own data-plane database/project.
   */
  @Column({ name: 'data_plane_type', type: 'varchar', length: 20, default: 'shared' })
  dataPlaneType: string;

  @Column({ name: 'data_plane_ref', type: 'varchar', length: 255, nullable: true })
  dataPlaneRef: string | null;

  @Column({ name: 'data_plane_config_ref', type: 'varchar', length: 255, nullable: true })
  dataPlaneConfigRef: string | null;

  @Column({ name: 'data_plane_status', type: 'varchar', length: 20, default: 'provisioned' })
  dataPlaneStatus: string;
}
