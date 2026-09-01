import 'reflect-metadata';
import './env';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { AppDataSource } from './data-source';

/**
 * SQL migration revert utility — `pnpm db:migrate:revert`.
 *
 * Finds the most recently applied SQL migration (from schema_migrations),
 * applies its paired `*.rollback.sql` file when one exists, then removes the
 * record. If no rollback file exists (e.g. V2 rollback is pending review),
 * it prints a clear message instead of guessing.
 */
async function revertLast(): Promise<void> {
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
    const last: any[] = await ds.query(
      'SELECT filename FROM schema_migrations ORDER BY applied_at DESC, filename DESC LIMIT 1',
    );
    if (last.length === 0) {
      console.log('Nothing to revert — no applied SQL migrations recorded.');
      return;
    }
    const appliedFile = last[0].filename as string;
    const dir = join(__dirname, 'migrations');
    const base = appliedFile.replace(/\.sql$/i, '');
    const rollbackCandidates = readdirSync(dir).filter(
      (f) => f.toLowerCase() === `${base}.rollback.sql`.toLowerCase() || f.toLowerCase() === `${base}_rollback.sql`.toLowerCase(),
    );
    if (rollbackCandidates.length === 0) {
      console.log(`⚠️  ${appliedFile} has no paired .rollback.sql — nothing was changed.`);
      return;
    }
    const sql = readFileSync(join(dir, rollbackCandidates[0]), 'utf8');
    await ds.query(sql);
    await ds.query('DELETE FROM schema_migrations WHERE filename = $1', [appliedFile]);
    console.log(`✅ Reverted ${appliedFile} via ${rollbackCandidates[0]}`);
  } finally {
    await ds.destroy();
  }
}

revertLast().catch((err) => {
  console.error(err);
  process.exit(1);
});