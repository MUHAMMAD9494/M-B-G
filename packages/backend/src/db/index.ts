import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL || 'postgresql://nexora_user:nexora_password@localhost:5432/nexora_dev');
export const db = drizzle(client, { schema });

export type Database = typeof db;