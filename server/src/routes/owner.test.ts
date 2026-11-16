import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../app.ts';
import { expectContract } from '../contract/contract.ts';
import { staffMemberships, staffUsers } from '../db/schema.ts';
import { seedOwner, seedSamples } from '../db/seedSamples.ts';
import { testDb } from '../db/testDb.ts';
import type { VerifyOwner } from '../owner/clerk.ts';
import type { PaymentService } from '../payments.ts';
import { PaystackError, type Paystack } from '../paystack.ts';
import { venuePaystack } from '../venues/venuePaystack.ts';
import { TEST_KEY } from './testHelpers.ts';

const NOW = Date.parse('2026-11-16T12:00:00Z');
const OWNER = '+233200000001';
const WAITER = '+233200000002';
const KITCHEN = '+233200000003';

// Stands in for Clerk: "clerk:<user id>:<verified phone or email>" signs that person in.
const fakeClerk: VerifyOwner = async (token) => {
  const [kind, clerkUserId, address = ''] = token.split(':');
  if (kind !== 'clerk' || !clerkUserId) return null;
  const email = address.includes('@') ? address : null;
  return { clerkUserId, email, phone: email ? null : address || null, firstName: null };
};
const as = (clerkUserId: string, phone = '') => ({ Authorization: `Bearer clerk:${clerkUserId}:${phone}` });

async function setup(options: { verify?: VerifyOwner | null } = {}) {
  const db = await testDb();
  const { venueIds } = await seedSamples(db);
  await seedOwner(db, { phone: '020 000 0001', email: 'Ama@Example.com', firstName: 'Ama', venueIds });
  const mamas = venueIds.find((id) => id.includes('mama')) ?? venueIds[0]!;
  // A waiter and a cook at Mama's Kitchen only.
  for (const [id, phone, role] of [
    ['usr_waiter', WAITER, 'waiter'],
    ['usr_kitchen', KITCHEN, 'kitchen'],
  ] as const) {
    await db.insert(staffUsers).values({ id, phone, firstName: role });
    await db.insert(staffMemberships).values({ id: `mem_${id}`, venueId: mamas, userId: id, role, status: 'invited' });
  }
  // Paystack accepts only the key "sk_test_goodkey12345".
  const client = (secret: string): Paystack => ({
    chargeMomo: async () => ({ status: 'pay_offline', reference: 'x' }),
    initializeCard: async () => ({ authorization_url: 'https://checkout.paystack.com/x', reference: 'x' }),
    verify: async () => ({ status: 'ongoing', amount: 0, currency: 'GHS' }),
    checkKey: async () => {
      if (secret !== 'sk_test_goodkey12345') throw new PaystackError('Invalid key', 401);
    },
  });
  const logs: Record<string, unknown>[] = [];
  const app = createApp({
    guest: { db, guestSecret: 'test-guest-secret-that-is-long-enough', now: () => NOW },
    owner: {
      db,
      verify: options.verify === undefined ? fakeClerk : options.verify,
      now: () => NOW,
      venueKeys: venuePaystack({ db, key: TEST_KEY, client }),
      paystackClient: client,
    },
    payments: {} as PaymentService,
    allowedOrigins: [],
    log: (event) => logs.push(event),
    ping: async () => undefined,
  });
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await app.request(`/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };
  return { db, call, logs, mamas };
}

test('GET /me links the Clerk user by verified phone, then knows them by Clerk id', async () => {
  const { call } = await setup();
  assert.equal((await call('GET', '/me')).status, 401);
  const stranger = await call('GET', '/me', undefined, as('user_x', '+233209999999'));
  expectContract('getMe', 403, stranger.json);
  assert.equal(stranger.json.code, 'not_staff');

  const me = await call('GET', '/me', undefined, as('user_owner', OWNER));
  expectContract('getMe', 200, me.json);
  assert.equal(me.json.firstName, 'Ama');
  assert.equal(me.json.venues.length, 3);
  assert.ok(me.json.venues.every((v: { role: string }) => v.role === 'owner'));

  // Without a phone in the token, the Clerk id alone finds them now.
  assert.equal((await call('GET', '/me', undefined, as('user_owner'))).status, 200);
  // A number changed in Clerk shows up on the next call.
  const moved = await call('GET', '/me', undefined, as('user_owner', '+233200000009'));
  assert.equal(moved.json.phone, '+233200000009');
});

test('staff sign in by email code: the verified email finds the owner, and only once', async () => {
  const { call } = await setup();
  const me = await call('GET', '/me', undefined, as('user_email_owner', 'ama@example.com'));
  expectContract('getMe', 200, me.json);
  assert.equal(me.json.email, 'ama@example.com');
  assert.equal(me.json.venues.length, 3);
  // Another Clerk account with the same email can't take over a row that is already linked.
  const copy = await call('GET', '/me', undefined, as('user_someone_else', 'ama@example.com'));
  assert.equal(copy.json.code, 'not_staff');
});

test('owner calls say "not set up" while the server has no Clerk key', async () => {
  const { call } = await setup({ verify: null });
  const res = await call('GET', '/me', undefined, as('user_owner', OWNER));
  assert.equal(res.status, 503);
  assert.equal(res.json.code, 'sign_in_not_ready');
});

test('connecting Paystack: checked with Paystack, stored sealed, never returned; guests can then pay', async () => {
  const { call, logs, mamas } = await setup();
  const owner = as('user_owner', OWNER);
  const path = `/owner/venues/${mamas}/payment-settings/paystack`;
  const good = { mode: 'test', publicKey: 'pk_test_goodkey12345', secretKey: 'sk_test_goodkey12345' };

  assert.equal((await call('PUT', path, good, as('user_waiter', WAITER))).status, 403);
  const live = await call('PUT', path, { mode: 'live', publicKey: 'pk_live_goodkey12345', secretKey: 'sk_live_goodkey12345' }, owner);
  assert.equal(live.json.code, 'live_not_enabled');
  const mismatch = await call('PUT', path, { ...good, publicKey: 'pk_live_goodkey12345' }, owner);
  assert.equal(mismatch.json.code, 'paystack_mode_mismatch');
  const refused = await call('PUT', path, { ...good, secretKey: 'sk_test_wrongkey12345' }, owner);
  expectContract('ownerConnectPaystack', 422, refused.json);
  assert.equal(refused.json.code, 'paystack_keys_invalid');

  const connected = await call('PUT', path, good, owner);
  expectContract('ownerConnectPaystack', 200, connected.json);
  assert.equal(connected.json.paystack.secretKeyHint, '••••2345');
  assert.ok(!JSON.stringify(connected.json).includes('sk_test_goodkey'));
  assert.ok(!JSON.stringify(logs).includes('sk_test_goodkey'));
  assert.equal((await call('GET', '/venues/mamas-kitchen')).json.payEnabled, true);

  const check = await call('POST', `${path}/test`, undefined, owner);
  expectContract('ownerTestPaystack', 200, check.json);
  assert.equal(check.json.ok, true);

  const off = await call('DELETE', path, undefined, owner);
  expectContract('ownerDisconnectPaystack', 200, off.json);
  assert.equal(off.json.paystack, null);
  assert.equal((await call('GET', '/venues/mamas-kitchen')).json.payEnabled, false);
  assert.equal((await call('POST', `${path}/test`, undefined, owner)).json.ok, false);
});

test('manual methods need their details, and the fee share must be 1 to 100%', async () => {
  const { call, mamas } = await setup();
  const owner = as('user_owner', OWNER);
  const base = `/owner/venues/${mamas}/payment-settings`;
  const read = await call('GET', base, undefined, owner);
  expectContract('ownerGetPaymentSettings', 200, read.json);
  assert.equal((await call('GET', base, undefined, as('user_kitchen', KITCHEN))).status, 403);

  const manual = { cash: true, cardMachine: true, bankTransfer: { enabled: true }, momo: { enabled: false } };
  const missing = await call('PUT', `${base}/manual`, manual, owner);
  assert.equal(missing.json.code, 'manual_bank_incomplete');
  const saved = await call('PUT', `${base}/manual`, { ...manual, bankTransfer: { enabled: true, accountName: 'Mama K', accountNumber: '1234567890' } }, owner);
  expectContract('ownerSetManualPayments', 200, saved.json);
  assert.equal((await call('GET', '/venues/mamas-kitchen')).json.payMethods.bankTransfer.accountNumber, '1234567890');

  assert.equal((await call('PUT', `${base}/fees`, { enabled: true, percent: 0 }, owner)).json.code, 'fee_percent_invalid');
  const fees = await call('PUT', `${base}/fees`, { enabled: true, percent: 50 }, owner);
  expectContract('ownerSetFeePassing', 200, fees.json);
  assert.deepEqual(fees.json.feePassing, { enabled: true, percent: 50 });
});

test('the orders desk: staff see the venue’s orders, move them by role, and mark them paid once', async () => {
  const { call, mamas } = await setup();
  const token = (await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '4' })).json.guestToken;
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const order = (
    await call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] }, { Authorization: `Bearer ${token}` })
  ).json;

  const list = await call('GET', `/owner/venues/${mamas}/orders?status=received`, undefined, as('user_kitchen', KITCHEN));
  expectContract('ownerListOrders', 200, list.json);
  assert.deepEqual(list.json.items.map((o: { id: string }) => o.id), [order.id]);
  // Another venue's staff list: not theirs.
  assert.equal((await call('GET', `/owner/venues/ven_bean_there/orders`, undefined, as('user_kitchen', KITCHEN))).status, 403);

  const status = `/owner/orders/${order.id}/status`;
  const waiterStart = await call('PUT', status, { status: 'preparing' }, as('user_waiter', WAITER));
  expectContract('ownerSetOrderStatus', 409, waiterStart.json);
  const started = await call('PUT', status, { status: 'preparing' }, as('user_kitchen', KITCHEN));
  expectContract('ownerSetOrderStatus', 200, started.json);
  assert.equal(started.json.status, 'preparing');
  const ready = await call('PUT', status, { status: 'ready' }, as('user_kitchen', KITCHEN));
  assert.ok(ready.json.readyAt);
  assert.equal((await call('GET', `/orders/${order.id}`, undefined, { Authorization: `Bearer ${token}` })).json.status, 'ready');

  const pay = `/owner/orders/${order.id}/manual-payment`;
  assert.equal((await call('POST', pay, { method: 'cash' }, as('user_kitchen', KITCHEN))).status, 403);
  const paid = await call('POST', pay, { method: 'cash' }, { ...as('user_waiter', WAITER), 'Idempotency-Key': 'k1' });
  expectContract('ownerRecordManualPayment', 200, paid.json);
  assert.equal(paid.json.paymentStatus, 'paid');
  assert.equal(paid.json.paymentMethod, 'cash');
  const again = await call('POST', pay, { method: 'momo_merchant' }, as('user_waiter', WAITER));
  assert.equal(again.json.paymentMethod, 'cash');
});
