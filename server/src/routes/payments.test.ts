import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createApp } from '../app.ts';
import { expectContract } from '../contract/contract.ts';
import { paymentStore } from '../db/paymentStore.ts';
import { billQuotes, paymentSettings } from '../db/schema.ts';
import { seedSamples } from '../db/seedSamples.ts';
import { testDb } from '../db/testDb.ts';
import { paymentService } from '../payments.ts';
import type { Paystack } from '../paystack.ts';
import type { PaystackTransaction } from '../status.ts';
import { connectTestPaystack, TEST_KEY, VENUE_SECRET } from './testHelpers.ts';
import { venuePaystack } from '../venues/venuePaystack.ts';

const NOW = Date.parse('2026-11-16T12:00:00Z');

/** A fake Paystack that remembers which secret key each call used, and what verify should say. */
function fakePaystack() {
  const used: string[] = [];
  let answer: (amount: number) => PaystackTransaction = (amount) => ({ status: 'ongoing', amount, currency: 'GHS' });
  const amounts = new Map<string, number>();
  const client = (secret: string): Paystack => ({
    chargeMomo: async (input) => {
      used.push(secret);
      amounts.set(input.reference, input.amountPesewas);
      return { status: 'pay_offline', reference: input.reference, display_text: 'Approve on your phone' };
    },
    initializeCard: async (input) => {
      used.push(secret);
      amounts.set(input.reference, input.amountPesewas);
      return { authorization_url: 'https://checkout.paystack.com/abc', reference: input.reference };
    },
    verify: async (reference) => {
      used.push(secret);
      return answer(amounts.get(reference) ?? 0);
    },
  });
  return { client, used, succeed: () => (answer = (amount) => ({ status: 'success', amount, currency: 'GHS' })) };
}

async function setup(options: { connect?: boolean } = {}) {
  const db = await testDb();
  await seedSamples(db);
  const fake = fakePaystack();
  const keys = venuePaystack({ db, key: TEST_KEY, client: fake.client });
  const logs: Record<string, unknown>[] = [];
  let clock = NOW;
  const app = createApp({
    guest: { db, guestSecret: 'test-guest-secret-that-is-long-enough', now: () => clock },
    payments: paymentService({
      paystackFor: (slug) => keys.forVenueSlug(slug),
      store: paymentStore(db),
      siteUrl: 'https://cravins-app.vercel.app',
      now: () => clock,
    }),
    allowedOrigins: [],
    log: (event) => logs.push(event),
    ping: async () => undefined,
  });
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await app.request(`/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };
  const venueId = (await call('GET', '/venues/mamas-kitchen')).json.id as string;
  if (options.connect !== false) await connectTestPaystack(db, venueId, fake.client);

  /** Scan table 12, order two of the first dish, and get a quote for the whole bill. */
  const tableBill = async (table = '12') => {
    const token = (await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: table })).json.guestToken as string;
    const auth = { Authorization: `Bearer ${token}` };
    const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
    const order = (await call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 2 }] }, auth)).json;
    const quote = (await call('POST', `/orders/${order.id}/bill`, { mode: 'whole', tip: { percent: 10 } }, auth)).json;
    return { auth, order, quote };
  };
  const momo = (quoteId: string) => ({ quoteId, method: 'momo', momo: { phone: '+233241234567', provider: 'mtn' } });
  return { db, call, fake, logs, venueId, tableBill, momo, tick: (ms: number) => (clock += ms) };
}

test('a payment charges the quote with the venue’s own key, and success marks the order paid', async () => {
  const { call, fake, logs, tableBill, momo } = await setup();
  const { auth, order, quote } = await tableBill();

  const started = await call('POST', '/payments', momo(quote.quoteId), { ...auth, 'Idempotency-Key': 'k1' });
  expectContract('initializePayment', 201, started.json);
  assert.equal(started.json.status, 'pay_offline');
  // The amount is the server's quote (share + tip + fee), not anything the app sent.
  assert.equal(started.json.amountPesewas, quote.totalPesewas);
  assert.equal(started.json.tipPesewas, quote.tipPesewas);
  assert.equal(started.json.testMode, true);
  assert.deepEqual(fake.used, [VENUE_SECRET]);
  assert.ok(!JSON.stringify(logs).includes('241234567'));

  fake.succeed();
  const verified = await call('POST', `/payments/${started.json.reference}/verify`, undefined, auth);
  expectContract('verifyPayment', 200, verified.json);
  assert.equal(verified.json.status, 'succeeded');

  const paid = (await call('GET', `/orders/${order.id}`, undefined, auth)).json;
  assert.equal(paid.paymentStatus, 'paid');
  assert.equal(paid.paidPesewas, order.totalPesewas);
  assert.equal(paid.paymentMethod, 'online_momo');
  assert.ok(paid.lines.every((line: { paid: boolean }) => line.paid));

  // Verifying again doesn't count the money twice, and a new payment for it is refused.
  await call('POST', `/payments/${started.json.reference}/verify`, undefined, auth);
  assert.equal((await call('GET', `/orders/${order.id}`, undefined, auth)).json.paidPesewas, order.totalPesewas);
  const again = await call('POST', '/payments', momo(quote.quoteId), { ...auth, 'Idempotency-Key': 'k2' });
  assert.equal(again.json.code, 'nothing_to_pay');
});

test('the same Idempotency-Key gives back the first payment, and charges once', async () => {
  const { call, fake, tableBill, momo, tick } = await setup();
  const { auth, quote } = await tableBill();
  const first = await call('POST', '/payments', momo(quote.quoteId), { ...auth, 'Idempotency-Key': 'same' });
  tick(11 * 60_000); // even after the quote has expired
  const second = await call('POST', '/payments', momo(quote.quoteId), { ...auth, 'Idempotency-Key': 'same' });
  assert.equal(second.json.reference, first.json.reference);
  assert.equal(fake.used.length, 1);
});

test('refusals: no key, no token, a quote from another table, an expired quote, Paystack not connected', async () => {
  const { db, call, tableBill, momo, tick, venueId } = await setup();
  const { auth, quote } = await tableBill();
  assert.equal((await call('POST', '/payments', momo(quote.quoteId), auth)).status, 400);
  assert.equal((await call('POST', '/payments', momo(quote.quoteId), { 'Idempotency-Key': 'a' })).status, 401);
  const noPhone = await call('POST', '/payments', { quoteId: quote.quoteId, method: 'momo' }, { ...auth, 'Idempotency-Key': 'b' });
  assert.equal(noPhone.status, 422);

  const other = await tableBill('3');
  const stolen = await call('POST', '/payments', momo(quote.quoteId), { ...other.auth, 'Idempotency-Key': 'c' });
  expectContract('initializePayment', 409, stolen.json);
  assert.equal(stolen.json.code, 'quote_expired');

  tick(11 * 60_000);
  const late = await call('POST', '/payments', momo(quote.quoteId), { ...auth, 'Idempotency-Key': 'd' });
  assert.equal(late.json.code, 'quote_expired');

  // The owner disconnects Paystack between the quote and the payment.
  const fresh = await tableBill();
  await venuePaystack({ db, key: TEST_KEY, client: () => ({}) as Paystack }).remove(venueId, NOW);
  const off = await call('POST', '/payments', momo(fresh.quote.quoteId), { ...fresh.auth, 'Idempotency-Key': 'e' });
  assert.equal(off.status, 409);
  assert.equal(off.json.code, 'online_pay_off');
});

test('a guest can only see payments for orders they can see', async () => {
  const { call, tableBill, momo } = await setup();
  const { auth, quote } = await tableBill();
  const started = (await call('POST', '/payments', momo(quote.quoteId), { ...auth, 'Idempotency-Key': 'k1' })).json;
  const mine = await call('GET', `/payments/${started.reference}`, undefined, auth);
  expectContract('getPayment', 200, mine.json);
  const stranger = (await call('POST', '/guest-sessions', { venueSlug: 'bean-there' })).json.guestToken;
  const hidden = await call('GET', `/payments/${started.reference}`, undefined, { Authorization: `Bearer ${stranger}` });
  expectContract('getPayment', 404, hidden.json);
});

test('webhooks are checked with the venue’s key: forged ones are refused, real ones pay the order', async () => {
  const { call, tableBill, momo } = await setup();
  const { auth, order, quote } = await tableBill();
  const started = (await call('POST', '/payments', momo(quote.quoteId), { ...auth, 'Idempotency-Key': 'k1' })).json;
  const body = JSON.stringify({
    event: 'charge.success',
    data: { reference: started.reference, status: 'success', amount: started.amountPesewas, currency: 'GHS' },
  });
  const sign = (secret: string) => createHmac('sha512', secret).update(body).digest('hex');

  const forged = await call('POST', '/webhooks/paystack', body, { 'x-paystack-signature': sign('sk_test_someoneelse') });
  assert.equal(forged.status, 401);
  assert.equal((await call('GET', `/orders/${order.id}`, undefined, auth)).json.paymentStatus, 'unpaid');

  const real = await call('POST', '/webhooks/paystack', body, { 'x-paystack-signature': sign(VENUE_SECRET) });
  assert.equal(real.status, 200);
  assert.equal((await call('GET', `/orders/${order.id}`, undefined, auth)).json.paymentStatus, 'paid');

  // The venue's other Paystack sales aren't ours: accepted and ignored, so Paystack stops retrying.
  const elsewhere = JSON.stringify({ event: 'charge.success', data: { reference: 'T123', status: 'success', amount: 100, currency: 'GHS' } });
  assert.equal((await call('POST', '/webhooks/paystack', elsewhere)).status, 200);
});

test('paying for your own items marks just those lines paid, and the order part paid', async () => {
  const { db, call, fake, venueId } = await setup();
  await db.update(paymentSettings).set({ feePassing: { enabled: true, percent: 100 } }).where(eq(paymentSettings.venueId, venueId));
  const token = (await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '5' })).json.guestToken;
  const auth = { Authorization: `Bearer ${token}` };
  const [a, b] = (await call('GET', '/venues/mamas-kitchen/menu')).json.items;
  const order = (
    await call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: a.id, quantity: 1 }, { menuItemId: b.id, quantity: 1 }] }, auth)
  ).json;
  const quote = (await call('POST', `/orders/${order.id}/bill`, { mode: 'items', lineIds: [order.lines[0].id] }, auth)).json;
  const [row] = await db.select().from(billQuotes).where(eq(billQuotes.id, quote.quoteId));
  assert.ok(row && row.feePesewas > 0);

  const started = (await call('POST', '/payments', { quoteId: quote.quoteId, method: 'card' }, { ...auth, 'Idempotency-Key': 'k1' })).json;
  assert.equal(started.status, 'open_url');
  assert.equal(started.feePesewas, quote.feePesewas);
  fake.succeed();
  await call('POST', `/payments/${started.reference}/verify`, undefined, auth);

  const after = (await call('GET', `/orders/${order.id}`, undefined, auth)).json;
  assert.equal(after.paymentStatus, 'part_paid');
  // Only the food share counts: the passed-on fee never pays for food.
  assert.equal(after.paidPesewas, order.lines[0].totalPesewas);
  assert.deepEqual(after.lines.map((line: { paid: boolean }) => line.paid), [true, false]);
  assert.equal(after.paymentMethod, 'online_card');
});
