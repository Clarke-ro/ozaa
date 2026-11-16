import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { MIGRATIONS, type Db } from './client.ts';
import * as schema from './schema.ts';

/**
 * For tests: a real Postgres running inside Node (PGlite), with every migration applied.
 * Each call is a fresh, empty database, so tests never see each other's rows.
 */
export async function testDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}
