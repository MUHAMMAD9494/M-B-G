import * as dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Loads the repo-root .env for standalone database scripts
 * (db:migrate / db:verify / db:migrate:revert / db:seed).
 * pnpm --filter scripts run with cwd=apps/api and ts-node resolves __dirname
 * against the compiled layout, so we probe several known candidate paths.
 * dotenv does not override already-set process env values.
 */
const candidates = [
  join(__dirname, '../../.env'), // repo root (app layout)
  join(__dirname, '../../../.env'), // repo root (source layout)
  join(process.cwd(), '.env'), // cwd
  join(process.cwd(), '../../.env'), // root when cwd=apps/api
];

for (const p of candidates) {
  if (existsSync(p)) {
    dotenv.config({ path: p });
  }
}
dotenv.config(); // fallback: default ./.env