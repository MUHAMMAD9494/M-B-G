import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

/**
 * Roles are seeded from the canonical role model (see @nexora/types).
 * Per-tenant custom roles are a documented future extension; the schema is
 * present so it can be added without a breaking migration.
 */
@Entity('roles')
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  /** Null for platform-global roles. */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  description: string | null;
}
