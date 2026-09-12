"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
require("./env");
const fs_1 = require("fs");
const path_1 = require("path");
const data_source_1 = require("./data-source");
async function revertLast() {
    const ds = data_source_1.AppDataSource;
    await ds.initialize();
    try {
        await ds.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
         filename TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`);
        const last = await ds.query('SELECT filename FROM schema_migrations ORDER BY applied_at DESC, filename DESC LIMIT 1');
        if (last.length === 0) {
            console.log('Nothing to revert — no applied SQL migrations recorded.');
            return;
        }
        const appliedFile = last[0].filename;
        const dir = (0, path_1.join)(__dirname, 'migrations');
        const base = appliedFile.replace(/\.sql$/i, '');
        const rollbackCandidates = (0, fs_1.readdirSync)(dir).filter((f) => f.toLowerCase() === `${base}.rollback.sql`.toLowerCase() || f.toLowerCase() === `${base}_rollback.sql`.toLowerCase());
        if (rollbackCandidates.length === 0) {
            console.log(`⚠️  ${appliedFile} has no paired .rollback.sql — nothing was changed.`);
            return;
        }
        const sql = (0, fs_1.readFileSync)((0, path_1.join)(dir, rollbackCandidates[0]), 'utf8');
        await ds.query(sql);
        await ds.query('DELETE FROM schema_migrations WHERE filename = $1', [appliedFile]);
        console.log(`✅ Reverted ${appliedFile} via ${rollbackCandidates[0]}`);
    }
    finally {
        await ds.destroy();
    }
}
revertLast().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=revert.js.map