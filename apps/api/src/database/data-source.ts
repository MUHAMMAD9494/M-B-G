import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { entities } from '../entities';

/**
 * Standalone DataSource for the TypeORM CLI (migrations + seed).
 * The NestJS app uses the same connection options via AppModule.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities,
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  migrationsRun: false,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
