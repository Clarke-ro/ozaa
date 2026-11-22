import { fileURLToPath } from 'node:url';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema.ts';

/** Any Postgres the server talks to: Supabase in production, PGlite in tests. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS = fileURLToPath(new URL('../../drizzle', import.meta.url));

/**
 * Connects to Postgres. `prepare: false` because Supabase's connection pooler (the address to use
 * from Vercel Functions, which open many short connections) can't keep prepared statements.
 */
export function connect(url: string, max = 10): { db: Db; close: () => Promise<void> } {
  const client = postgres(url, { prepare: false, max });
  return { db: drizzleClient(client), close: () => client.end() };
}

/**
 * Drizzle over postgres-js. Drizzle turns off postgres-js's own date handling because it formats
 * dates itself, but only for its query builder. A Date inside a hand-written sql`` query then
 * reached the driver unformatted and the query failed, in production only: tests use PGlite,
 * which formats dates by itself. So a Date sent as a timestamp becomes an ISO string again;
 * the strings Drizzle already formats pass through unchanged.
 */
export function drizzleClient(client: postgres.Sql): Db {
  const db = drizzle(client, { schema });
  const passThrough = client.options.serializers[1184];
  client.options.serializers[1184] = (value: unknown) =>
    value instanceof Date ? value.toISOString() : passThrough ? passThrough(value) : value;
  return db;
}

/** Brings the database up to the newest migration in drizzle/. Safe to run again. */
export async function migrateDb(url: string): Promise<void> {
  // onnotice: Postgres's "already exists, skipping" notices on a re-run are not news.
  const client = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS });
  } finally {
    await client.end();
  }
}
