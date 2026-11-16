import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { businesses, menuCategories, menuItems, orders, venues } from './schema.ts';
import { testDb } from './testDb.ts';

const rows = (result: unknown) =>
  (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as Record<string, unknown>[];

test('every table has Row Level Security on, so Supabase\'s public API reads nothing', async () => {
  const db = await testDb();
  const tables = rows(
    await db.execute(sql`select relname, relrowsecurity from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r'`),
  );
  assert.ok(tables.length >= 27, `expected every table, found ${tables.length}`);
  const open = tables.filter((t) => !t.relrowsecurity).map((t) => t.relname);
  assert.deepEqual(open, []);
});

async function venueWithDish() {
  const db = await testDb();
  await db.insert(businesses).values({ id: 'bus_1', name: "Mama's" });
  await db.insert(venues).values({ id: 'ven_1', businessId: 'bus_1', slug: 'mamas-kitchen', name: "Mama's Kitchen", profile: {} });
  await db.insert(menuCategories).values({ id: 'cat_1', venueId: 'ven_1', name: { en: 'Mains' }, kind: 'food', position: 0 });
  return db;
}

const dish = { id: 'itm_1', venueId: 'ven_1', categoryId: 'cat_1', name: { en: 'Jollof' }, description: { en: '' } };

test('a venue slug must be URL-safe, as the QR codes need', async () => {
  const db = await venueWithDish();
  await assert.rejects(db.insert(venues).values({ id: 'ven_2', businessId: 'bus_1', slug: 'Bad Slug', name: 'X', profile: {} }));
});

test('a sale price must be below the normal price, and stock never goes below zero', async () => {
  const db = await venueWithDish();
  await assert.rejects(db.insert(menuItems).values({ ...dish, pricePesewas: 5000, salePricePesewas: 5000 }));
  await assert.rejects(db.insert(menuItems).values({ ...dish, pricePesewas: 5000, stockCount: -1 }));
  await db.insert(menuItems).values({ ...dish, pricePesewas: 5000, salePricePesewas: 4000, stockCount: 0 });
});

const order = {
  venueId: 'ven_1',
  businessDay: '2026-11-16',
  status: 'received' as const,
  subtotalPesewas: 5000,
  totalPesewas: 5000,
};

test('an order can never be paid more than its total, and its number is unique for the day', async () => {
  const db = await venueWithDish();
  await assert.rejects(db.insert(orders).values({ ...order, id: 'ord_1', number: 1, paidPesewas: 5001 }));
  await db.insert(orders).values({ ...order, id: 'ord_1', number: 1 });
  await assert.rejects(db.insert(orders).values({ ...order, id: 'ord_2', number: 1 }));
  await db.insert(orders).values({ ...order, id: 'ord_3', number: 1, businessDay: '2026-11-17' });
});
