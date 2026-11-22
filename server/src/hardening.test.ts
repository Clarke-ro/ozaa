import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { createApp } from './app.ts';
import { seedSamples } from './db/seedSamples.ts';
import { testDb } from './db/testDb.ts';
import type { PaymentService } from './payments.ts';

// Security hardening that sits in front of every route: headers, HTTPS only, a body size cap and
// rate limits on what guests can do without signing in.
async function setup() {
  const db = await testDb();
  await seedSamples(db);
  const app = createApp({
    guest: {
      db,
      guestSecret: 'test-guest-secret-that-is-long-enough',
      now: () => Date.parse('2026-11-16T12:00:00Z'),
    },
    payments: {} as PaymentService,
    allowedOrigins: [],
    log: () => undefined,
    ping: async () => undefined,
  });
  const call = (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    app.request(`/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body === undefined
        ? {}
        : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
  return { call };
}

test('every answer carries security headers', async () => {
  const { call } = await setup();
  const res = await call('GET', '/health');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('x-frame-options'));
  assert.ok(res.headers.get('strict-transport-security'));
});

test('a plain-HTTP request is refused, so a token is never answered over it', async () => {
  const { call } = await setup();
  const res = await call('GET', '/venues/mamas-kitchen', undefined, {
    'x-forwarded-proto': 'http',
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, 'https_required');
  assert.equal(
    (await call('GET', '/venues/mamas-kitchen', undefined, { 'x-forwarded-proto': 'https' }))
      .status,
    200,
  );
});

test('a JSON answer is gzipped when the phone asks, and still reads as the same JSON', async () => {
  const { call } = await setup();
  const res = await call('GET', '/venues/mamas-kitchen/menu', undefined, {
    'Accept-Encoding': 'gzip',
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-encoding'), 'gzip');
  const raw = Buffer.from(await res.arrayBuffer());
  const json = JSON.parse(gunzipSync(raw).toString()) as { items: unknown[] };
  assert.ok(json.items.length > 0);
  assert.ok(raw.length < Buffer.byteLength(JSON.stringify(json)));
});

test('a request body over 256 KB is refused before any route reads it', async () => {
  const { call } = await setup();
  const res = await call(
    'POST',
    '/guest-sessions',
    JSON.stringify({ venueSlug: 'mamas-kitchen', pad: 'x'.repeat(300 * 1024) }),
  );
  assert.equal(res.status, 413);
  assert.equal((await res.json()).code, 'too_large');
});

test('a dining room can start more than 30 visits from one address', async () => {
  const { call } = await setup();
  const from = { 'x-forwarded-for': '9.9.9.9, 1.1.1.1' };
  for (let i = 0; i < 40; i += 1) {
    assert.equal(
      (await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen' }, from)).status,
      201,
    );
  }
});

test('starting visits still stops one address eventually, and another address is free', async () => {
  const db = await testDb();
  await seedSamples(db);
  const app = createApp({
    guest: {
      db,
      guestSecret: 'test-guest-secret-that-is-long-enough',
      now: () => Date.parse('2026-11-16T12:00:00Z'),
    },
    payments: {} as PaymentService,
    allowedOrigins: [],
    log: () => undefined,
    ping: async () => undefined,
    guestLimits: { newVisitsPerMinute: 2 },
  });
  const call = (ip: string) =>
    app.request('/v1/guest-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `9.9.9.9, ${ip}` },
      body: JSON.stringify({ venueSlug: 'mamas-kitchen' }),
    });
  assert.equal((await call('1.1.1.1')).status, 201);
  assert.equal((await call('1.1.1.1')).status, 201);
  const blocked = await call('1.1.1.1');
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).code, 'rate_limited');
  assert.equal((await call('2.2.2.2')).status, 201);
});

test('one guest who writes too fast does not block another guest on the same address', async () => {
  const db = await testDb();
  await seedSamples(db);
  const app = createApp({
    guest: {
      db,
      guestSecret: 'test-guest-secret-that-is-long-enough',
      now: () => Date.parse('2026-11-16T12:00:00Z'),
    },
    payments: {} as PaymentService,
    allowedOrigins: [],
    log: () => undefined,
    ping: async () => undefined,
    guestLimits: { sessionWritesPerMinute: 1, ipWritesPerMinute: 10 },
  });
  const from = { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9, 1.1.1.1' };
  const open = async (table: string) => {
    const res = await app.request('/v1/guest-sessions', {
      method: 'POST',
      headers: from,
      body: JSON.stringify({ venueSlug: 'mamas-kitchen', tableCode: table }),
    });
    return (await res.json()).guestToken as string;
  };
  const dish = (await (await app.request('/v1/venues/mamas-kitchen/menu')).json()).items[0];
  const order = (token: string) =>
    app.request('/v1/orders', {
      method: 'POST',
      headers: { ...from, Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        clientOrderId: randomUUID(),
        lines: [{ menuItemId: dish.id, quantity: 1 }],
      }),
    });
  const first = await open('12');
  const second = await open('5');
  assert.equal((await order(first)).status, 201);
  assert.equal((await order(first)).status, 429);
  assert.equal((await order(second)).status, 201);
});

test('one table visit can place 20 orders in 10 minutes, not a flood', async () => {
  const { call } = await setup();
  const session = await (
    await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '12' })
  ).json();
  const dish = (await (await call('GET', '/venues/mamas-kitchen/menu')).json()).items[0];
  const auth = { Authorization: `Bearer ${session.guestToken}` };
  const order = () =>
    call(
      'POST',
      '/orders',
      { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] },
      auth,
    );
  for (let i = 0; i < 20; i += 1) assert.equal((await order()).status, 201);
  const flood = await order();
  assert.equal(flood.status, 429);
  assert.equal((await flood.json()).code, 'rate_limited');
});
