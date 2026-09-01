import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AttendanceType, GeofenceStatus, SyncStatus } from '@nexora/types';
import { BaseEntity } from '../common/base.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { Branch } from './branch.entity';
import { School } from './school.entity';
import { Teacher } from './teacher.entity';

/**
 * Individual attendance event (check-in or check-out). Append-only.
 * Multiple events can exist per day per teacher; the daily record is
 * the rolled-up view.
 */
@Entity('attendance_events')
@Index('idx_att_events_school', ['schoolId'])
@Index('idx_att_events_teacher', ['teacherId'])
@Index('idx_att_events_record', ['recordId'])
export class AttendanceEvent extends BaseEntity {
  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch | null;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({ name: 'record_id', type: 'uuid', nullable: true })
  recordId: string | null;

  @ManyToOne(() => AttendanceRecord, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'record_id' })
  record: AttendanceRecord | null;

  @Column({ name: 'attendance_type', type: 'varchar', length: 20 })
  attendanceType: AttendanceType;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ name: 'server_timestamp', type: 'timestamptz', default: () => 'NOW()' })
  serverTimestamp: Date;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  accuracy: number | null;

  @Column({ name: 'geofence_status', type: 'varchar', length: 20, nullable: true })
  geofenceStatus: GeofenceStatus | string | null;

  @Column({ name: 'identity_verification_status', type: 'varchar', length: 30, nullable: true })
  identityVerificationStatus: string | null;

  @Column({ name: 'liveness_status', type: 'varchar', length: 30, nullable: true })
  livenessStatus: string | null;

  @Column({ name: 'device_id', type: 'varchar', length: 255, nullable: true })
  deviceId: string | null;

  @Column({ name: 'offline_created', type: 'boolean', default: false })
  offlineCreated: boolean;

  @Column({ name: 'sync_status', type: 'varchar', length: 20, default: SyncStatus.SYNCED })
  syncStatus: SyncStatus | string;

  @Column({ name: 'verification_method', type: 'varchar', length: 50, nullable: true })
  verificationMethod: string | null;

  /**
   * Auditable verification state, server-set:
   * verified_online | verified_local | pending_verification | failed_verification.
   */
  @Column({ name: 'verification_state', type: 'varchar', length: 30, default: 'verified_online' })
  verificationState: string;

  /**
   * Device-generated idempotency key. Unique per school when present;
   * replayed syncs reuse it and are deduplicated server-side.
   */
  @Column({ name: 'client_event_id', type: 'varchar', length: 100, nullable: true })
  clientEventId: string | null;

  @Column({ name: 'risk_score', type: 'int', default: 0 })
  riskScore: number;
}
