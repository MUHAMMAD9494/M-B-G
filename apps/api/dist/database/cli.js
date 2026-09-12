"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const data_source_1 = require("./data-source");
async function run() {
    const [cmd] = process.argv.slice(2);
    await data_source_1.AppDataSource.initialize();
    try {
        if (cmd === 'migration:run') {
            await data_source_1.AppDataSource.runMigrations();
            console.log('✅ Migrations applied.');
        }
        else if (cmd === 'migration:revert') {
            await data_source_1.AppDataSource.undoLastMigration();
            console.log('✅ Last migration reverted.');
        }
        else {
            console.error(`Unknown command: ${cmd}`);
            process.exitCode = 1;
        }
    }
    finally {
        await data_source_1.AppDataSource.destroy();
    }
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map