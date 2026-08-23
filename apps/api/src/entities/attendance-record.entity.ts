import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AttendanceStatus, GeofenceStatus } from '@nexora/types';
import { BaseEntity } from '../common/base.entity';
import { Branch } from './branch.entity';
import { School } from './school.entity';
import { Teacher } from './teacher.entity';

/**
 * Daily attendance record — one per teacher per day.
 * The authoritative row for status, dashboard queries, and reports.
 */
@Entity('attendance_records')
@Index('idx_att_records_school_date', ['schoolId', 'date'])
@Index('idx_att_records_teacher', ['teacherId'])
@Index('idx_att_records_branch', ['branchId'])
export class AttendanceRecord extends BaseEntity {
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

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'check_in_time', type: 'timestamptz', nullable: true })
  checkInTime: Date | null;

  @Column({ name: 'check_out_time', type: 'timestamptz', nullable: true })
  checkOutTime: Date | null;

  @Column({ name: 'check_in_latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  checkInLatitude: number | null;

  @Column({ name: 'check_in_longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  checkInLongitude: number | null;

  @Column({ name: 'check_in_accuracy', type: 'decimal', precision: 10, scale: 2, nullable: true })
  checkInAccuracy: number | null;

  @Column({ name: 'check_in_geofence_status', type: 'varchar', length: 20, nullable: true })
  checkInGeofenceStatus: GeofenceStatus | null;

  @Column({ name: 'check_in_verification_status', type: 'varchar', length: 30, nullable: true })
  checkInVerificationStatus: string | null;

  @Column({ name: 'check_out_latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  checkOutLatitude: number | null;

  @Column({ name: 'check_out_longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  checkOutLongitude: number | null;

  @Column({ name: 'check_out_accuracy', type: 'decimal', precision: 10, scale: 2, nullable: true })
  checkOutAccuracy: number | null;

  @Column({ name: 'check_out_geofence_status', type: 'varchar', length: 20, nullable: true })
  checkOutGeofenceStatus: GeofenceStatus | null;

  @Column({ name: 'check_out_verification_status', type: 'varchar', length: 30, nullable: true })
  checkOutVerificationStatus: string | null;

  @Column({ type: 'varchar', length: 20, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Column({ name: 'risk_score', type: 'int', default: 0 })
  riskScore: number;
}