import 'reflect-metadata';
import './env';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { AppDataSource } from './data-source';

/**
 * SQL migration runner for NEXORA.
 *
 * Applies every `migrations/*.sql` file (excluding `*.rollback.sql`) that has
 * not yet been recorded in the `schema_migrations` table, in lexicographic
 * order. Migration files MUST be transactional (BEGIN/COMMIT) so a failure
 * never leaves a half-applied schema.
 *
 * Usage: pnpm db:migrate  (runs the @nexora/api script)
 */
async function runMigrations(): Promise<void> {
  const ds = AppDataSource;
  await ds.initialize();
  try {
    await ds.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         filename TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appliedRows: any[] = await ds.query('SELECT filename FROM schema_migrations');
    const applied = new Set<string>(appliedRows.map((r) => r.filename));

    const dir = join(__dirname, 'migrations');
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql') && !f.includes('.rollback.'))
      .sort();

    let appliedCount = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(dir, file), 'utf8');
      try {
        await ds.query(sql);
      } catch (err) {
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
      await ds.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      console.log(`✅ Applied ${file}`);
      appliedCount++;
    }
    console.log(appliedCount > 0 ? `Migration run complete: ${appliedCount} applied.` : 'No pending migrations.');
  } finally {
    await ds.destroy();
  }
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});