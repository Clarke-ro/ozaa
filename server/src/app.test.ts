import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.ts';
import { readConfig, readDatabaseUrl } from './config.ts';
import type { Paystack } from './paystack.ts';
import { paymentStore } from './db/paymentStore.ts';
import { testDb } from './db/testDb.ts';
import { paymentService } from './payments.ts';

const paystack: Paystack = {
  chargeMomo: async (i) => ({ status: 'pay_offline', reference: i.reference, display_text: 'Approve' }),
  initializeCheckout: async (i) => ({ authorization_url: 'https://checkout.paystack.com/x', reference: i.reference }),
  checkKey: async () => undefined,
  verify: async () => ({ status: 'ongoing', amount: 3_800, currency: 'GHS' }),
};

async function setup(ping: () => Promise<void> = async () => {}) {
  const logs: Record<string, unknown>[] = [];
  const payments = paymentService({
    paystackFor: async () => ({ paystack, secret: 'sk_test_venue', testMode: true }),
    store: paymentStore(await testDb()),
    siteUrl: 'http://localhost:8081',
  });
  const app = createApp({ payments, allowedOrigins: ['http://localhost:8081'], log: (e) => logs.push(e), ping });
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

const BASE = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/cravins',
  GUEST_TOKEN_SECRET: 'x'.repeat(32),
  ENCRYPTION_KEY: 'a'.repeat(64),
};

test('the server refuses to start with a live key, and never prints the key', () => {
  assert.throws(() => readConfig({ PAYSTACK_SECRET_KEY: 'sk_live_secret123' }), (error: Error) => {
    assert.match(error.message, /test key/);
    assert.ok(!error.message.includes('secret123'));
    return true;
  });
  assert.equal(
    readConfig({ ...BASE, PAYSTACK_SECRET_KEY: 'sk_test_x' }).PORT,
    4000,
  );
  // Venues bring their own keys, so the server starts without one.
  assert.equal(readConfig(BASE).PAYSTACK_SECRET_KEY, undefined);
});

test('the server needs a 32-byte encryption key, and never prints it', () => {
  assert.throws(() => readConfig({ ...BASE, ENCRYPTION_KEY: undefined }), /ENCRYPTION_KEY is missing/);
  assert.throws(
    () => readConfig({ ...BASE, ENCRYPTION_KEY: 'tooshort-abc123' }),
    (error: Error) => !error.message.includes('tooshort') && /64 hex/.test(error.message),
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

test('unexpected errors go to monitoring; expected answers (a Problem) never do', async () => {
  const reported: string[] = [];
  const payments = paymentService({ paystackFor: async () => null, store: paymentStore(await testDb()), siteUrl: 'http://localhost:8081' });
  const app = createApp({
    payments,
    allowedOrigins: [],
    log: () => undefined,
    ping: async () => {
      throw new Error('boom');
    },
    report: (error) => reported.push(error.message),
  });
  app.get('/crash', () => {
    throw new TypeError('x is undefined');
  });
  assert.equal((await app.request('/v1/crash')).status, 500);
  assert.equal((await app.request('/v1/nowhere')).status, 404);
  assert.deepEqual(reported, ['x is undefined']);
});
