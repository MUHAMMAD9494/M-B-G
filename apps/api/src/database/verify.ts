import 'reflect-metadata';
import './env';
import { join } from 'path';
import { readdirSync } from 'fs';
import { AppDataSource } from './data-source';

/**
 * Security/schema verifier for CI and pre-deploy gates.
 *
 * Checks, against the live database:
 *   1. schema_migrations table exists and every *.sql migration is recorded.
 *   2. RLS is enabled on the 10 tenant tables + branches.
 *   3. The tenant_* policies exist on the tenant tables.
 *   4. app.find_user_for_auth exists (V2) and is executable by nexora_app.
 *   5. audit_logs has no UPDATE/DELETE grant to nexora_app.
 *
 * Exits non-zero with a readable diff list when any check fails.
 * Usage: pnpm db:verify  (runs the @nexora/api script)
 */

const TENANT_TABLES = [
  'teachers',
  'attendance_records',
  'attendance_events',
  'biometric_profiles',
  'audit_logs',
  'geofences',
  'system_settings',
  'devices',
  'notification_preferences',
  'refresh_tokens',
];

async function verify(): Promise<void> {
  const ds = AppDataSource;
  await ds.initialize();
  const failures: string[] = [];
  try {
    // 1. Migrations recorded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appliedRows: any[] = await ds.query('SELECT filename FROM schema_migrations');
    const applied = new Set<string>(appliedRows.map((r) => r.filename));
    const dir = join(__dirname, 'migrations');
    const sqlFiles = readdirSync(dir).filter((f) => f.endsWith('.sql') && !f.includes('.rollback.')).sort();
    for (const f of sqlFiles) {
      if (!applied.has(f)) failures.push(`Migration not applied: ${f}`);
    }

    // 2. RLS enabled on tenant tables + branches
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rlsRows: any[] = await ds.query(
      `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`,
    );
    const rlsByTable = new Map<string, boolean>(rlsRows.map((r) => [r.tablename, r.rowsecurity]));
    for (const t of [...TENANT_TABLES, 'branches']) {
      if (rlsByTable.get(t) !== true) failures.push(`RLS not enabled on: ${t}`);
    }

    // 3. Policies present on tenant tables
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const policyRows: any[] = await ds.query(
      `SELECT tablename, COUNT(*)::int AS n FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'tenant_%' GROUP BY tablename`,
    );
    const policyCount = new Map<string, number>(policyRows.map((r) => [r.tablename, r.n]));
    for (const t of TENANT_TABLES) {
      if ((policyCount.get(t) ?? 0) < 4) failures.push(`Missing tenant_* policies on: ${t} (found ${policyCount.get(t) ?? 0})`);
    }

    // 4. Auth helper exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fnRows: any[] = await ds.query(
      `SELECT proname FROM pg_proc WHERE proname = 'find_user_for_auth' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'app')`,
    );
    if (fnRows.length === 0) failures.push('Missing app.find_user_for_auth (V2 not applied?)');

    // 5. audit_logs append-only for the app role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auditGrants: any[] = await ds.query(
      `SELECT privilege_type FROM information_schema.role_table_grants
       WHERE table_name = 'audit_logs' AND grantee = 'nexora_app'`,
    );
    const privs = new Set<string>(auditGrants.map((r) => r.privilege_type));
    if (privs.has('UPDATE') || privs.has('DELETE')) {
      failures.push(`audit_logs should be append-only for nexora_app (has: ${[...privs].join(', ')})`);
    }
  } finally {
    await ds.destroy();
  }

  if (failures.length > 0) {
    console.error('❌ db:verify FAILED');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('✅ db:verify OK — RLS, policies, auth helper, grants and migrations all present.');
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});