import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { School } from './school.entity';
import { Teacher } from './teacher.entity';
import { User } from './user.entity';

/**
 * Stores only a hashed/encrypted biometric template reference (never raw
 * photos). `embeddingHash` points at encrypted, provider-managed storage; it
 * is never exposed through ordinary API responses.
 */
@Entity('biometric_profiles')
@Index('idx_biometric_school', ['schoolId'])
@Index('idx_biometric_teacher', ['teacherId'])
export class BiometricProfile extends BaseEntity {
  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({ name: 'provider_type', type: 'varchar', length: 50 })
  providerType: string;

  /** SHA-256 / encrypted hash of the stored template. */
  @Column({ name: 'embedding_hash', type: 'varchar', length: 255 })
  embeddingHash: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'enrolled_by', type: 'uuid', nullable: true })
  enrolledBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'enrolled_by' })
  enroller: User | null;
}
