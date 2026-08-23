import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Tenant isolation core. Every query touching tenant-owned tables runs inside
 * `withTenant()` which opens a transaction and sets the PostgreSQL session
 * variable `app.school_id` consumed by Row Level Security policies (created in
 * the migration). Application-level scoping is ALSO applied (defense in depth).
 *
 * Users with schoolId === null (SUPER_ADMIN) bypass RLS via `app.is_super`.
 */
@Injectable()
export class TenantScopeService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Run `fn` inside a tenant-scoped transaction. `schoolId` must be the
   * authenticated user's school (never a client-supplied value).
   */
  async withTenant<T>(
    schoolId: string | null,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (schoolId) {
        await queryRunner.query(`SELECT set_config('app.school_id', $1, true)`, [schoolId]);
        await queryRunner.query(`SELECT set_config('app.is_super', 'false', true)`);
      } else {
        // Platform-level (super admin) context.
        await queryRunner.query(`SELECT set_config('app.school_id', '', true)`);
        await queryRunner.query(`SELECT set_config('app.is_super', 'true', true)`);
      }
      const result = await fn(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
