import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { menuItems, orders, payments, promos } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import type { PromoRule } from '../shared/promos.ts';
import type { TaxSetup } from '../shared/types.ts';
import { menuOf, publicVenue, venueRowById } from '../venues/venueData.ts';
import { as, NOW, OWNER, ownerSetup, WAITER } from '../routes/ownerTestSetup.ts';
import { priceOrder } from './priceOrder.ts';
import { saveOrder } from './orderStore.ts';

const owner = as('user_owner', OWNER);
const waiter = as('user_waiter', WAITER);
// A guest order that nobody accepts only keeps its dish and promo for half an hour.
const HOLD_MS = 30 * 60_000;
// One visit can leave this many orders waiting. The 20-in-10-minutes limit still applies on top.
const OPEN_CAP = 8;

async function guestToken(call: Awaited<ReturnType<typeof ownerSetup>>['call'], tableCode = '4') {
  const res = await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode });
  return res.json.guestToken as string;
}

function guest(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function dishOf(call: Awaited<ReturnType<typeof ownerSetup>>['call']) {
  const menu = (await call('GET', '/venues/mamas-kitchen/menu')).json;
  return menu.items[0] as { id: string; pricePesewas: number };
}

async function place(
  call: Awaited<ReturnType<typeof ownerSetup>>['call'],
  token: string,
  dishId: string,
  extra: Record<string, unknown> = {},
  clientOrderId = randomUUID(),
) {
  return call(
    'POST',
    '/orders',
    { clientOrderId, lines: [{ menuItemId: dishId, quantity: 1 }], ...extra },
    guest(token),
  );
}

async function stockOf(call: Awaited<ReturnType<typeof ownerSetup>>['call'], dishId: string) {
  const menu = (await call('GET', '/venues/mamas-kitchen/menu')).json;
  return menu.items.find((item: { id: string }) => item.id === dishId) as { stockCount: number | null; available: boolean };
}

async function priceFor(
  db: Awaited<ReturnType<typeof ownerSetup>>['db'],
  venueId: string,
  dishId: string,
  now: number,
  promoCode?: string,
) {
  const row = await venueRowById(db, venueId);
  const venue = await publicVenue(db, row, now);
  const menu = await menuOf(db, venueId);
  const rules = await db.select().from(promos).where(eq(promos.venueId, venueId));
  return priceOrder({
    items: menu.items,
    venue,
    promos: rules
      .filter((rule) => !rule.deletedAt)
      .map((rule) => ({ ...(rule.rule as PromoRule), id: rule.id, usageCount: rule.usageCount, enabled: rule.enabled, code: rule.code })),
    tax: (row.tax as TaxSetup | null) ?? null,
    body: { lines: [{ menuItemId: dishId, quantity: 1 }], ...(promoCode ? { promoCode } : {}) },
    tableCode: '4',
    now,
  });
}

test('cancelling gives the dish and the promo back, and a second cancel does not give them back twice', async () => {
  const { call, db, mamas } = await ownerSetup();
  const token = await guestToken(call);
  const dish = await dishOf(call);
  await db.update(menuItems).set({ stockCount: 2, available: true }).where(eq(menuItems.id, dish.id));
  const promo = (
    await call('POST', `/owner/venues/${mamas}/promos`, { name: 'Ten off', kind: 'percent_off', percent: 10, channel: 'all', enabled: true, code: 'jollof10', usageLimit: 1 }, owner)
  ).json;
  const clientOrderId = randomUUID();
  const first = await place(call, token, dish.id, { promoCode: 'JOLLOF10' }, clientOrderId);
  assert.equal(first.status, 201);
  assert.equal(first.json.promoDiscounts.length, 1);
  assert.equal((await stockOf(call, dish.id)).stockCount, 1);

  const cancelled = await call('PUT', `/owner/orders/${first.json.id}/status`, { status: 'cancelled', cancelReason: 'Guest changed their mind' }, owner);
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.json.status, 'cancelled');
  const after = await stockOf(call, dish.id);
  assert.equal(after.stockCount, 2);
  assert.equal(after.available, true);
  const usage = (await call('GET', `/owner/venues/${mamas}/promos`, undefined, owner)).json.items.find((item: { id: string }) => item.id === promo.id);
  assert.equal(usage.usageCount, 0);
  assert.equal(usage.discountGivenPesewas, 0);

  const again = await call('PUT', `/owner/orders/${first.json.id}/status`, { status: 'cancelled' }, owner);
  assert.equal(again.status, 409);
  assert.equal((await stockOf(call, dish.id)).stockCount, 2, 'a second cancel must not add the dish on again');

  const retry = await place(call, token, dish.id, { promoCode: 'JOLLOF10' }, clientOrderId);
  assert.equal(retry.json.id, first.json.id, 'the same tap still returns the first order');
  assert.equal((await stockOf(call, dish.id)).stockCount, 2, 'that retry must not take the dish again');

  const second = await place(call, token, dish.id, { promoCode: 'JOLLOF10' });
  assert.equal(second.status, 201);
  assert.equal(second.json.promoDiscounts[0].promoId, promo.id, 'the freed promo works on the next order');
  assert.equal((await stockOf(call, dish.id)).stockCount, 1);

  const accepted = await place(call, token, dish.id);
  assert.equal(accepted.status, 201);
  assert.equal((await call('PUT', `/owner/orders/${accepted.json.id}/status`, { status: 'accepted' }, waiter)).status, 200);
  assert.equal((await call('PUT', `/owner/orders/${accepted.json.id}/status`, { status: 'cancelled', cancelReason: '86' }, owner)).status, 200);
  assert.equal((await stockOf(call, dish.id)).stockCount, 1, 'cancelling after the kitchen accepts still gives the dish back');
});

test('an unpaid guest order that nobody accepts expires; paid, accepted, part-paid and staff orders stay', async () => {
  const { call, db, mamas, tick } = await ownerSetup();
  const token = await guestToken(call);
  const dish = await dishOf(call);
  await db.update(menuItems).set({ stockCount: 5, available: true }).where(eq(menuItems.id, dish.id));
  const order = () => place(call, token, dish.id);
  const waiting = (await order()).json;
  const accepted = (await order()).json;
  assert.equal((await call('PUT', `/owner/orders/${accepted.id}/status`, { status: 'accepted' }, waiter)).status, 200);
  const cash = (await order()).json;
  assert.equal((await call('POST', `/owner/orders/${cash.id}/manual-payment`, { method: 'cash' }, waiter)).json.paymentStatus, 'paid');
  const part = (await order()).json;
  assert.ok(part.totalPesewas > 100);
  await db.update(orders).set({ paidPesewas: 100 }).where(eq(orders.id, part.id));
  const staff = await call(
    'POST',
    `/owner/venues/${mamas}/orders`,
    { clientOrderId: randomUUID(), tableCode: '4', lines: [{ menuItemId: dish.id, quantity: 1 }] },
    waiter,
  );
  assert.equal(staff.status, 201);
  assert.equal((await stockOf(call, dish.id)).stockCount, 0);

  tick(HOLD_MS);
  assert.equal((await call('GET', `/orders/${waiting.id}`, undefined, guest(token))).json.status, 'received', 'the hold lasts the full half hour');
  tick(1);
  const menu = await call('GET', '/venues/mamas-kitchen/menu');
  assert.equal(menu.json.items.find((item: { id: string }) => item.id === dish.id).stockCount, 1);

  const expired = await call('GET', `/orders/${waiting.id}`, undefined, guest(token));
  assert.equal(expired.json.status, 'cancelled');
  assert.match(expired.json.cancelReason, /didn't accept/i);
  assert.equal((await call('GET', `/orders/${accepted.id}`, undefined, guest(token))).json.status, 'accepted');
  const paid = await call('GET', `/orders/${cash.id}`, undefined, guest(token));
  assert.equal(paid.json.status, 'received');
  assert.equal(paid.json.paymentStatus, 'paid');
  const partial = await call('GET', `/orders/${part.id}`, undefined, guest(token));
  assert.equal(partial.json.status, 'received');
  assert.equal(partial.json.paymentStatus, 'part_paid');
  const staffList = await call('GET', `/owner/venues/${mamas}/orders?status=received`, undefined, waiter);
  assert.ok(staffList.json.items.some((item: { id: string }) => item.id === staff.json.id));
  assert.equal((await stockOf(call, dish.id)).stockCount, 1, 'only the expired order gives its dish back');
});

test('a payment that is still in progress keeps the hold; a failed one does not', async () => {
  const { call, db, tick } = await ownerSetup();
  const token = await guestToken(call);
  const dish = await dishOf(call);
  await db.update(menuItems).set({ stockCount: 1, available: true }).where(eq(menuItems.id, dish.id));
  const held = (await place(call, token, dish.id)).json;
  await db.insert(payments).values({
    reference: 'pay_hold',
    idempotencyKey: 'idem_hold',
    orderId: held.id,
    venueSlug: 'mamas-kitchen',
    method: 'momo',
    amountPesewas: held.totalPesewas,
    status: 'pay_offline',
    testMode: true,
    createdAt: new Date(NOW),
  });
  tick(HOLD_MS + 1);
  assert.equal((await call('GET', `/orders/${held.id}`, undefined, guest(token))).json.status, 'received');
  assert.equal((await stockOf(call, dish.id)).stockCount, 0);

  await db.update(payments).set({ status: 'abandoned' }).where(eq(payments.reference, 'pay_hold'));
  assert.equal((await call('GET', `/orders/${held.id}`, undefined, guest(token))).json.status, 'cancelled');
  assert.equal((await stockOf(call, dish.id)).stockCount, 1);
});

test('one visit cannot leave a pile of unpaid orders waiting', async () => {
  const { call } = await ownerSetup();
  const token = await guestToken(call);
  const dish = await dishOf(call);
  const firstId = randomUUID();
  let stoppedAt = -1;
  let savedId = '';
  for (let i = 0; i < OPEN_CAP + 4; i += 1) {
    const res = await place(call, token, dish.id, {}, i === 0 ? firstId : randomUUID());
    if (res.status === 429) {
      stoppedAt = i;
      assert.equal(res.json.code, 'too_many_open_orders');
      break;
    }
    assert.equal(res.status, 201);
    if (i === 0) savedId = res.json.id;
  }
  assert.equal(stoppedAt, OPEN_CAP);

  const retry = await place(call, token, dish.id, {}, firstId);
  assert.equal(retry.status, 201);
  assert.equal(retry.json.id, savedId, 'tapping the same order again is not a new one');

  assert.equal((await call('PUT', `/owner/orders/${savedId}/status`, { status: 'accepted' }, waiter)).status, 200);
  const next = await place(call, token, dish.id);
  assert.equal(next.status, 201, 'once the kitchen accepts one, the guest can order again');
});

test('the last portion and the last promo use cannot be taken twice, even together', async () => {
  const { call, db, mamas } = await ownerSetup();
  const dish = await dishOf(call);
  await db.update(menuItems).set({ stockCount: 1, available: true }).where(eq(menuItems.id, dish.id));
  const save = (suffix: string, pricedOrder: Awaited<ReturnType<typeof priceFor>>) =>
    saveOrder(db, {
      venueId: mamas,
      guestSessionId: `visit-${suffix}`,
      clientOrderId: randomUUID(),
      tableCode: '4',
      priced: pricedOrder,
      now: NOW,
    });

  const firstPortion = await priceFor(db, mamas, dish.id, NOW);
  const secondPortion = await priceFor(db, mamas, dish.id, NOW);
  await save('stock-a', firstPortion);
  await assert.rejects(
    () => save('stock-b', secondPortion),
    (error: unknown) => {
      assert.ok(error instanceof Problem);
      assert.equal(error.code, 'item_sold_out');
      return true;
    },
  );
  const [taken] = await db.select().from(menuItems).where(eq(menuItems.id, dish.id));
  assert.equal(taken!.stockCount, 0);

  await db.update(menuItems).set({ stockCount: 1, available: true }).where(eq(menuItems.id, dish.id));
  const leftA = await priceFor(db, mamas, dish.id, NOW);
  const leftB = await priceFor(db, mamas, dish.id, NOW);
  const raced = await Promise.allSettled([save('stock-c', leftA), save('stock-d', leftB)]);
  assert.equal(raced.filter((result) => result.status === 'fulfilled').length, 1);
  const [item] = await db.select().from(menuItems).where(eq(menuItems.id, dish.id));
  assert.equal(item!.stockCount, 0);

  await db.update(menuItems).set({ stockCount: null, available: true }).where(eq(menuItems.id, dish.id));
  await call(
    'POST',
    `/owner/venues/${mamas}/promos`,
    { name: 'First one', kind: 'percent_off', percent: 20, channel: 'all', enabled: true, usageLimit: 1 },
    owner,
  );
  const withPromo = async () => priceFor(db, mamas, dish.id, NOW);
  const promoA = await withPromo();
  const promoB = await withPromo();
  assert.equal(promoA.promoDiscounts.length, 1);
  assert.equal(promoB.promoDiscounts.length, 1, 'both were priced before either was saved');
  await save('promo-a', promoA);
  await assert.rejects(
    () => save('promo-b', promoB),
    (error: unknown) => {
      assert.ok(error instanceof Problem);
      assert.equal(error.code, 'promo_not_valid');
      return true;
    },
  );
  const [promo] = await db.select().from(promos).where(eq(promos.venueId, mamas));
  assert.equal(promo!.usageCount, 1);

  await db.update(promos).set({ usageCount: 0, discountGivenPesewas: 0 }).where(eq(promos.id, promo!.id));
  const promoC = await withPromo();
  const promoD = await withPromo();
  const promoRace = await Promise.allSettled([save('promo-c', promoC), save('promo-d', promoD)]);
  assert.equal(promoRace.filter((result) => result.status === 'fulfilled').length, 1);
  const [used] = await db.select().from(promos).where(eq(promos.id, promo!.id));
  assert.equal(used!.usageCount, 1);
});

test('a daily number collision is retried and the order still saves', async () => {
  const { call, db } = await ownerSetup();
  const token = await guestToken(call);
  const dish = await dishOf(call);
  await db.execute(sql`create sequence test_order_number_collide`);
  await db.execute(sql`
    create function test_collide_daily_number() returns trigger as $$
    begin
      if nextval('test_order_number_collide') = 1 then
        raise exception 'duplicate key value violates unique constraint "orders_daily_number"'
          using errcode = '23505', constraint = 'orders_daily_number';
      end if;
      return new;
    end;
    $$ language plpgsql
  `);
  await db.execute(sql`
    create trigger test_collide_daily_number
    before insert on orders
    for each row
    execute function test_collide_daily_number()
  `);

  const first = await place(call, token, dish.id);
  assert.equal(first.status, 201, first.json?.detail ?? first.json?.title);
  assert.equal(first.json.number, 1);
  const second = await place(call, token, dish.id);
  assert.equal(second.status, 201);
  assert.equal(second.json.number, 2);

  const tokenB = await guestToken(call, '5');
  const together = await Promise.all([place(call, token, dish.id), place(call, tokenB, dish.id), place(call, token, dish.id)]);
  assert.deepEqual(
    together.map((res) => res.status),
    [201, 201, 201],
  );
  const numbers = together.map((res) => res.json.number as number);
  assert.equal(new Set(numbers).size, numbers.length);
});
