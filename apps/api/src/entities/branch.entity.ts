import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BranchStatus } from '@nexora/types';
import { BaseEntity } from '../common/base.entity';
import { School } from './school.entity';

@Entity('branches')
@Index('idx_branches_school', ['schoolId'])
export class Branch extends BaseEntity {
  @Index('idx_branches_school_id')
  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  address: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone: string | null;

  @Column({ type: 'enum', enum: BranchStatus, default: BranchStatus.ACTIVE })
  status: BranchStatus;
}
