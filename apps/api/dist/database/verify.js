"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
require("./env");
const path_1 = require("path");
const fs_1 = require("fs");
const data_source_1 = require("./data-source");
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
async function verify() {
    const ds = data_source_1.AppDataSource;
    await ds.initialize();
    const failures = [];
    try {
        const appliedRows = await ds.query('SELECT filename FROM schema_migrations');
        const applied = new Set(appliedRows.map((r) => r.filename));
        const dir = (0, path_1.join)(__dirname, 'migrations');
        const sqlFiles = (0, fs_1.readdirSync)(dir).filter((f) => f.endsWith('.sql') && !f.includes('.rollback.')).sort();
        for (const f of sqlFiles) {
            if (!applied.has(f))
                failures.push(`Migration not applied: ${f}`);
        }
        const rlsRows = await ds.query(`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`);
        const rlsByTable = new Map(rlsRows.map((r) => [r.tablename, r.rowsecurity]));
        for (const t of [...TENANT_TABLES, 'branches']) {
            if (rlsByTable.get(t) !== true)
                failures.push(`RLS not enabled on: ${t}`);
        }
        const policyRows = await ds.query(`SELECT tablename, COUNT(*)::int AS n FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'tenant_%' GROUP BY tablename`);
        const policyCount = new Map(policyRows.map((r) => [r.tablename, r.n]));
        for (const t of TENANT_TABLES) {
            if ((policyCount.get(t) ?? 0) < 4)
                failures.push(`Missing tenant_* policies on: ${t} (found ${policyCount.get(t) ?? 0})`);
        }
        const fnRows = await ds.query(`SELECT proname FROM pg_proc WHERE proname = 'find_user_for_auth' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'app')`);
        if (fnRows.length === 0)
            failures.push('Missing app.find_user_for_auth (V2 not applied?)');
        const auditGrants = await ds.query(`SELECT privilege_type FROM information_schema.role_table_grants
       WHERE table_name = 'audit_logs' AND grantee = 'nexora_app'`);
        const privs = new Set(auditGrants.map((r) => r.privilege_type));
        if (privs.has('UPDATE') || privs.has('DELETE')) {
            failures.push(`audit_logs should be append-only for nexora_app (has: ${[...privs].join(', ')})`);
        }
    }
    finally {
        await ds.destroy();
    }
    if (failures.length > 0) {
        console.error('❌ db:verify FAILED');
        for (const f of failures)
            console.error(`  - ${f}`);
        process.exit(1);
    }
    console.log('✅ db:verify OK — RLS, policies, auth helper, grants and migrations all present.');
}
verify().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=verify.js.map