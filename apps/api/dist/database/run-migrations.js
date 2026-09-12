"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
require("./env");
const fs_1 = require("fs");
const path_1 = require("path");
const data_source_1 = require("./data-source");
async function runMigrations() {
    const ds = data_source_1.AppDataSource;
    await ds.initialize();
    try {
        await ds.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
         filename TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`);
        const appliedRows = await ds.query('SELECT filename FROM schema_migrations');
        const applied = new Set(appliedRows.map((r) => r.filename));
        const dir = (0, path_1.join)(__dirname, 'migrations');
        const files = (0, fs_1.readdirSync)(dir)
            .filter((f) => f.endsWith('.sql') && !f.includes('.rollback.'))
            .sort();
        let appliedCount = 0;
        for (const file of files) {
            if (applied.has(file))
                continue;
            const sql = (0, fs_1.readFileSync)((0, path_1.join)(dir, file), 'utf8');
            try {
                await ds.query(sql);
            }
            catch (err) {
                throw new Error(`Migration ${file} failed: ${err.message}`);
            }
            await ds.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
            console.log(`✅ Applied ${file}`);
            appliedCount++;
        }
        console.log(appliedCount > 0 ? `Migration run complete: ${appliedCount} applied.` : 'No pending migrations.');
    }
    finally {
        await ds.destroy();
    }
}
runMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=run-migrations.js.map