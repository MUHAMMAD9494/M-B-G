import { Column, Entity, Index } from 'typeorm';
import { RoleName, UserStatus } from '@nexora/types';
import { BaseEntity } from '../common/base.entity';

@Entity('users')
@Index('idx_users_school', ['schoolId'])
export class User extends BaseEntity {
  /** Null for SUPER_ADMIN (platform-level). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId: string | null;

  @Column({ type: 'varchar', length: 320, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  /** bcrypt hash. Never serialized to API responses. */
  @Column({ name: 'password_hash', type: 'varchar', length: 200 })
  passwordHash: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'enum', enum: RoleName })
  role: RoleName;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;
}
