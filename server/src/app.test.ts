import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createApp, SANDBOX_QUOTE } from './app.ts';
import { readConfig, readDatabaseUrl } from './config.ts';
import type { Paystack } from './paystack.ts';
import { paymentStore } from './db/paymentStore.ts';
import { testDb } from './db/testDb.ts';
import { paymentService } from './payments.ts';

const secret = 'sk_test_example';
const paystack: Paystack = {
  chargeMomo: async (i) => ({ status: 'pay_offline', reference: i.reference, display_text: 'Approve' }),
  initializeCard: async (i) => ({ authorization_url: 'https://checkout.paystack.com/x', reference: i.reference }),
  verify: async () => ({ status: 'ongoing', amount: 3_800, currency: 'GHS' }),
};

async function setup(ping: () => Promise<void> = async () => {}) {
  const logs: Record<string, unknown>[] = [];
  const payments = paymentService({ paystack, store: paymentStore(await testDb()), siteUrl: 'http://localhost:8081', testMode: true, newReference: () => 'pay_1' });
  const app = createApp({ payments, secret, allowedOrigins: ['http://localhost:8081'], log: (e) => logs.push(e), ping });
  return { app, logs };
}

test('GET /health says ok while the database answers', async () => {
  const { app } = await setup();
  const res = await app.request('/v1/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('GET /health says 503 when the database is down, without the error text', async () => {
  const { app, logs } = await setup(async () => {
    throw new Error('connect ECONNREFUSED postgres://user:secret@host');
  });
  const res = await app.request('/v1/health');
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { status: 'database_unreachable' });
  assert.equal(JSON.stringify(logs).includes('secret'), false);
});

const quote = Buffer.from(
  JSON.stringify({ orderId: 'ord_1', venueSlug: 'bean-there', amountPesewas: 3_800, tipPesewas: 0 }),
).toString('base64');
const momoBody = JSON.stringify({ quoteId: 'quo_1', method: 'momo', momo: { phone: '+233241234567', provider: 'mtn' } });
const start = async (headers: Record<string, string>, body = momoBody) =>
  (await setup()).app.request('/v1/payments', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });

test('POST /payments starts MoMo and logs no phone number', async () => {
  const { app, logs } = await setup();
  const res = await app.request('/v1/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'k1', [SANDBOX_QUOTE]: quote },
    body: momoBody,
  });
  assert.equal(res.status, 201);
  const payment = (await res.json()) as { status: string; amountPesewas: number };
  assert.equal(payment.status, 'pay_offline');
  assert.equal(payment.amountPesewas, 3_800);
  assert.ok(!JSON.stringify(logs).includes('241234567'));
});

test('POST /payments needs an Idempotency-Key, the sandbox quote and valid details', async () => {
  assert.equal((await start({ [SANDBOX_QUOTE]: quote })).status, 400);
  assert.equal((await start({ 'Idempotency-Key': 'k1' })).status, 400);
  assert.equal((await start({ 'Idempotency-Key': 'k1', [SANDBOX_QUOTE]: 'bm90IGpzb24=' })).status, 400);
  const noPhone = JSON.stringify({ quoteId: 'quo_1', method: 'momo' });
  assert.equal((await start({ 'Idempotency-Key': 'k1', [SANDBOX_QUOTE]: quote }, noPhone)).status, 422);
});

test('an unknown payment is a 404 in the Problem shape', async () => {
  const res = await (await setup()).app.request('/v1/payments/nope');
  assert.equal(res.status, 404);
  assert.equal(((await res.json()) as { code: string }).code, 'payment_not_found');
});

test('webhooks: unsigned is refused, signed is accepted', async () => {
  const { app } = await setup();
  const body = JSON.stringify({
    event: 'charge.success',
    data: { reference: 'pay_1', status: 'success', amount: 3_800, currency: 'GHS' },
  });
  const unsigned = await app.request('/v1/webhooks/paystack', { method: 'POST', body });
  assert.equal(unsigned.status, 401);
  const signature = createHmac('sha512', secret).update(body).digest('hex');
  const signed = await app.request('/v1/webhooks/paystack', {
    method: 'POST',
    body,
    headers: { 'x-paystack-signature': signature },
  });
  assert.equal(signed.status, 200);
});

test('the server refuses to start with a live key, and never prints the key', () => {
  assert.throws(() => readConfig({ PAYSTACK_SECRET_KEY: 'sk_live_secret123' }), (error: Error) => {
    assert.match(error.message, /test key/);
    assert.ok(!error.message.includes('secret123'));
    return true;
  });
  assert.equal(
    readConfig({ PAYSTACK_SECRET_KEY: 'sk_test_x', DATABASE_URL: 'postgresql://u:p@localhost:5432/cravins', GUEST_TOKEN_SECRET: 'x'.repeat(32) }).PORT,
    4000,
  );
});

test('the server needs a Postgres address, and never prints its password', () => {
  assert.throws(() => readConfig({ PAYSTACK_SECRET_KEY: 'sk_test_x' }), /DATABASE_URL is missing/);
  assert.throws(
    () => readConfig({ PAYSTACK_SECRET_KEY: 'sk_test_x', DATABASE_URL: 'mysql://u:hunter2@db/cravins' }),
    (error: Error) => {
      assert.match(error.message, /must start with postgres/);
      assert.ok(!error.message.includes('hunter2'));
      return true;
    },
  );
});

test('migrations need only the database address', () => {
  assert.equal(readDatabaseUrl({ DATABASE_URL: 'postgresql://u:p@localhost/c' }), 'postgresql://u:p@localhost/c');
  assert.throws(() => readDatabaseUrl({}), /DATABASE_URL is missing/);
});
