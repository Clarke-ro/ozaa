import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createApp } from '../app.ts';
import { expectContract } from '../contract/contract.ts';
import { menuItems, paymentSettings } from '../db/schema.ts';
import { seedSamples } from '../db/seedSamples.ts';
import { testDb } from '../db/testDb.ts';
import type { PaymentService } from '../payments.ts';
import { connectTestPaystack } from './testHelpers.ts';

const NOW = Date.parse('2026-11-16T12:00:00Z');

async function setup() {
  const db = await testDb();
  await seedSamples(db);
  const app = createApp({
    guest: { db, guestSecret: 'test-guest-secret-that-is-long-enough', now: () => NOW },
    payments: {} as PaymentService,
    allowedOrigins: [],
    log: () => undefined,
    ping: async () => undefined,
  });
  const call = async (method: string, path: string, body?: unknown, token?: string) => {
    const res = await app.request(`/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };
  const session = async (venueSlug: string, tableCode?: string) => {
    const res = await call('POST', '/guest-sessions', { venueSlug, ...(tableCode ? { tableCode } : {}) });
    expectContract('createGuestSession', res.status, res.json);
    return res.json.guestToken as string;
  };
  return { db, call, session };
}

test('a table scan starts a session, and the venue, menu, offers and Wi-Fi follow the contract', async () => {
  const { call, session } = await setup();
  const token = await session('mamas-kitchen', '12');

  const venue = await call('GET', '/venues/mamas-kitchen');
  expectContract('getVenue', 200, venue.json);
  assert.equal(venue.json.payEnabled, false);
  const menu = await call('GET', '/venues/mamas-kitchen/menu');
  expectContract('getMenu', 200, menu.json);
  assert.ok(menu.json.items.length > 0);
  expectContract('listOffers', 200, (await call('GET', '/venues/mamas-kitchen/offers')).json);

  // The Wi-Fi password is only for guests in a session at this venue.
  const wifi = await call('GET', '/venues/mamas-kitchen/wifi', undefined, token);
  expectContract('getWifi', 200, wifi.json);
  assert.equal((await call('GET', '/venues/mamas-kitchen/wifi')).status, 401);

  const missing = await call('POST', '/guest-sessions', { venueSlug: 'no-such-place' });
  expectContract('createGuestSession', 404, missing.json);
  assert.equal((await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '99' })).status, 404);
});

test('an order is priced by the server, a retry returns the same order, and numbers count up', async () => {
  const { call, session } = await setup();
  const token = await session('mamas-kitchen', '12');
  const menu = (await call('GET', '/venues/mamas-kitchen/menu')).json;
  const dish = menu.items[0];
  const clientOrderId = randomUUID();
  const order = await call('POST', '/orders', { clientOrderId, lines: [{ menuItemId: dish.id, quantity: 2 }] }, token);
  expectContract('createOrder', 201, order.json);
  assert.equal(order.json.totalPesewas, dish.pricePesewas * 2);
  assert.equal(order.json.tableCode, '12');
  assert.equal(order.json.status, 'received');
  assert.equal(order.json.paymentStatus, 'unpaid');

  const again = await call('POST', '/orders', { clientOrderId, lines: [{ menuItemId: dish.id, quantity: 2 }] }, token);
  assert.equal(again.json.id, order.json.id);
  const second = await call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] }, token);
  assert.equal(second.json.number, order.json.number + 1);

  const read = await call('GET', `/orders/${order.json.id}`, undefined, token);
  expectContract('getOrder', 200, read.json);
  // Another table can't read it.
  const other = await session('mamas-kitchen', '3');
  const hidden = await call('GET', `/orders/${order.json.id}`, undefined, other);
  expectContract('getOrder', 404, hidden.json);
  assert.equal((await call('POST', '/orders', { clientOrderId: randomUUID(), lines: [] }, token)).status, 400);
  assert.equal((await call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] })).status, 401);
});

test('a menu-link order needs contact details, and is saved for pickup with them', async () => {
  const { call, session } = await setup();
  const token = await session('bean-there');
  const dish = (await call('GET', '/venues/bean-there/menu')).json.items[0];
  const lines = [{ menuItemId: dish.id, quantity: 1 }];
  const bare = await call('POST', '/orders', { clientOrderId: randomUUID(), lines }, token);
  expectContract('createOrder', 400, bare.json);
  assert.equal(bare.json.code, 'missing_contact');
  const ok = await call(
    'POST',
    '/orders',
    { clientOrderId: randomUUID(), lines, fulfilment: { type: 'pickup', contact: { name: 'Ama', phone: '+233241234567' } } },
    token,
  );
  expectContract('createOrder', 201, ok.json);
  assert.equal(ok.json.source, 'pickup');
  assert.equal(ok.json.tableCode, null);
  assert.deepEqual(ok.json.contact, { name: 'Ama', phone: '+233241234567' });
});

test('stock runs out safely: the last one goes to one order, and the dish shows sold out', async () => {
  const { db, call, session } = await setup();
  const token = await session('mamas-kitchen', '12');
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  await db.update(menuItems).set({ stockCount: 1 }).where(eq(menuItems.id, dish.id));
  const lines = [{ menuItemId: dish.id, quantity: 2 }];
  const tooMany = await call('POST', '/orders', { clientOrderId: randomUUID(), lines }, token);
  expectContract('createOrder', 422, tooMany.json);
  const last = await call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] }, token);
  assert.equal(last.status, 201);
  const after = (await call('GET', '/venues/mamas-kitchen/menu')).json.items.find((i: { id: string }) => i.id === dish.id);
  assert.equal(after.available, false);
  assert.equal(after.stockCount, 0);
});

test('the bill quote: refused without Paystack; with it, the share, tip and passed-on fee', async () => {
  const { db, call, session } = await setup();
  const token = await session('mamas-kitchen', '12');
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const order = (await call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] }, token)).json;

  const off = await call('POST', `/orders/${order.id}/bill`, { mode: 'whole' }, token);
  expectContract('quoteBill', 409, off.json);
  assert.equal(off.json.code, 'online_pay_off');

  const venueId = (await call('GET', '/venues/mamas-kitchen')).json.id;
  await connectTestPaystack(db, venueId);
  await db.update(paymentSettings).set({ feePassing: { enabled: true, percent: 100 } }).where(eq(paymentSettings.venueId, venueId));
  const quote = await call('POST', `/orders/${order.id}/bill`, { mode: 'whole', tip: { percent: 10 } }, token);
  expectContract('quoteBill', 200, quote.json);
  assert.equal(quote.json.sharePesewas, order.totalPesewas);
  assert.equal(quote.json.tipPesewas, Math.round(order.totalPesewas * 0.1));
  assert.ok(quote.json.feePesewas > 0);
  assert.equal(quote.json.totalPesewas, quote.json.sharePesewas + quote.json.tipPesewas + quote.json.feePesewas);

  const atCap = await call('POST', `/orders/${order.id}/bill`, { mode: 'whole', tip: { customPesewas: 1_000_000 } }, token);
  assert.equal(atCap.status, 200);
  assert.equal(atCap.json.tipPesewas, 1_000_000);
  const over = await call('POST', `/orders/${order.id}/bill`, { mode: 'whole', tip: { customPesewas: 1_000_001 } }, token);
  assert.equal(over.status, 400);
  const overflow = await call('POST', `/orders/${order.id}/bill`, { mode: 'whole', tip: { customPesewas: 2_000_000_000 } }, token);
  assert.equal(overflow.status, 400);
});

test('a delivery fee is the far edge of the zone, not the phone pin', async () => {
  const { call, session } = await setup();
  const token = await session('mamas-kitchen');
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const order = await call(
    'POST',
    '/orders',
    {
      clientOrderId: randomUUID(),
      lines: [{ menuItemId: dish.id, quantity: 1 }],
      fulfilment: {
        type: 'delivery',
        contact: { name: 'Ama', phone: '+233241234567' },
        address: 'House 12, East Legon',
        location: { lat: 5.556, lng: -0.1822 },
      },
    },
    token,
  );
  assert.equal(order.status, 201);
  // Mama's zone is 8 km at 300 pesewas. A pin on the restaurant used to pay the 1500 minimum.
  assert.equal(order.json.deliveryFeePesewas, 2400);
  const tax = (order.json.taxes as { amountPesewas: number }[]).reduce((sum, line) => sum + line.amountPesewas, 0);
  const promo = (order.json.promoDiscounts as { pesewas: number }[]).reduce((sum, line) => sum + line.pesewas, 0);
  assert.equal(order.json.totalPesewas, order.json.subtotalPesewas - promo + tax + 2400);
});
