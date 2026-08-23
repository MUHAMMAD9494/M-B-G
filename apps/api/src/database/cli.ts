import 'reflect-metadata';
import { AppDataSource } from './data-source';

/**
 * Thin CLI wrapper so `pnpm db:migrate` / `db:migrate:revert` work without a
 * custom migration runner. Usage:
 *   pnpm --filter @nexora/api db:migrate
 */
async function run(): Promise<void> {
  const [cmd] = process.argv.slice(2);
  await AppDataSource.initialize();
  try {
    if (cmd === 'migration:run') {
      await AppDataSource.runMigrations();
      console.log('✅ Migrations applied.');
    } else if (cmd === 'migration:revert') {
      await AppDataSource.undoLastMigration();
      console.log('✅ Last migration reverted.');
    } else {
      console.error(`Unknown command: ${cmd}`);
      process.exitCode = 1;
    }
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
