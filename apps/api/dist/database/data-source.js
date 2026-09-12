"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const path_1 = require("path");
const entities_1 = require("../entities");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: entities_1.entities,
    migrations: [(0, path_1.join)(__dirname, 'migrations', '*{.ts,.js}')],
    migrationsRun: false,
    synchronize: false,
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
//# sourceMappingURL=data-source.js.map