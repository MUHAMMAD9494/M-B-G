import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('permissions')
export class PermissionEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  description: string | null;
}
