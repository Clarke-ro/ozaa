import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import {
  businesses,
  menuCategories,
  menuItems,
  orders,
  payments,
  staffUsers,
  venues,
} from './schema.ts';
import { testDb, testDbWithOrder } from './testDb.ts';

const rows = (result: unknown) =>
  (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as Record<
    string,
    unknown
  >[];

test('open orders and open calls have their own indexes', async () => {
  const db = await testDb();
  const found = rows(
    await db.execute(sql`
      select indexname from pg_indexes
      where indexname in ('orders_venue_open', 'orders_venue_updated', 'waiter_calls_venue_open')
    `),
  );
  assert.deepEqual(found.map((row) => row.indexname).sort(), [
    'orders_venue_open',
    'orders_venue_updated',
    'waiter_calls_venue_open',
  ]);
});

test("every table has Row Level Security on, so Supabase's public API reads nothing", async () => {
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
  await db
    .insert(venues)
    .values({
      id: 'ven_1',
      businessId: 'bus_1',
      slug: 'mamas-kitchen',
      name: "Mama's Kitchen",
      profile: {},
    });
  await db
    .insert(menuCategories)
    .values({ id: 'cat_1', venueId: 'ven_1', name: { en: 'Mains' }, kind: 'food', position: 0 });
  return db;
}

const dish = {
  id: 'itm_1',
  venueId: 'ven_1',
  categoryId: 'cat_1',
  name: { en: 'Jollof' },
  description: { en: '' },
};

test('a venue slug must be URL-safe, as the QR codes need', async () => {
  const db = await venueWithDish();
  await assert.rejects(
    db
      .insert(venues)
      .values({ id: 'ven_2', businessId: 'bus_1', slug: 'Bad Slug', name: 'X', profile: {} }),
  );
});

test('a sale price must be below the normal price, and stock never goes below zero', async () => {
  const db = await venueWithDish();
  await assert.rejects(
    db.insert(menuItems).values({ ...dish, pricePesewas: 5000, salePricePesewas: 5000 }),
  );
  await assert.rejects(
    db.insert(menuItems).values({ ...dish, pricePesewas: 5000, stockCount: -1 }),
  );
  await db
    .insert(menuItems)
    .values({ ...dish, pricePesewas: 5000, salePricePesewas: 4000, stockCount: 0 });
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
  await assert.rejects(
    db.insert(orders).values({ ...order, id: 'ord_1', number: 1, paidPesewas: 5001 }),
  );
  await db.insert(orders).values({ ...order, id: 'ord_1', number: 1 });
  await assert.rejects(db.insert(orders).values({ ...order, id: 'ord_2', number: 1 }));
  await db.insert(orders).values({ ...order, id: 'ord_3', number: 1, businessDay: '2026-11-17' });
});

test('a payment must belong to a real order, and two staff can never share a sign-in email', async () => {
  const db = await testDbWithOrder();
  const payment = {
    reference: 'pay_x',
    idempotencyKey: 'k1',
    venueSlug: 'bean-there',
    method: 'momo' as const,
    amountPesewas: 100,
    status: 'pending' as const,
    testMode: true,
    createdAt: new Date(),
  };
  await assert.rejects(db.insert(payments).values({ ...payment, orderId: 'ord_missing' }));
  await db.insert(payments).values({ ...payment, orderId: 'ord_1' });

  await db
    .insert(staffUsers)
    .values({ id: 'usr_a', phone: '+233200000011', firstName: 'A', email: 'esi@example.com' });
  // Even in another case: the app lower-cases emails, and the index does too.
  await assert.rejects(
    db
      .insert(staffUsers)
      .values({ id: 'usr_b', phone: '+233200000012', firstName: 'B', email: 'Esi@Example.com' }),
  );
  // Many people can have no email.
  await db.insert(staffUsers).values({ id: 'usr_c', phone: '+233200000013', firstName: 'C' });
  await db.insert(staffUsers).values({ id: 'usr_d', phone: '+233200000014', firstName: 'D' });
});
