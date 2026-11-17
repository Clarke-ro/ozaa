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

/**
 * A test database holding one venue and one order, `ord_1`. Payments must belong to a real order
 * (a foreign key), so payment tests start from this.
 */
export async function testDbWithOrder(): Promise<Db> {
  const db = await testDb();
  await db.insert(schema.businesses).values({ id: 'bus_1', name: 'Bean There' });
  await db.insert(schema.venues).values({ id: 'ven_1', businessId: 'bus_1', slug: 'bean-there', name: 'Bean There', profile: {} });
  await db.insert(schema.orders).values({
    id: 'ord_1',
    venueId: 'ven_1',
    number: 1,
    businessDay: '2026-11-16',
    status: 'received',
    subtotalPesewas: 13_000,
    totalPesewas: 13_000,
  });
  return db;
}
