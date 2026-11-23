import { randomUUID } from 'node:crypto';
import { createApp } from '../app.ts';
import { paymentStore } from '../db/paymentStore.ts';
import { seedSamples } from '../db/seedSamples.ts';
import { testDb } from '../db/testDb.ts';
import { paymentService } from '../payments.ts';
import type { Paystack } from '../paystack.ts';
import type { PaystackTransaction } from '../status.ts';
import { venuePaystack } from '../venues/venuePaystack.ts';
import { connectTestPaystack, TEST_KEY } from './testHelpers.ts';

// The payment tests' world: the sample venues, a fake Paystack, and a table bill ready to pay.

export const NOW = Date.parse('2026-11-16T12:00:00Z');

/** A fake Paystack that remembers which secret key each call used, and what verify should say. */
export function fakePaystack() {
  const used: string[] = [];
  const channels: string[][] = [];
  let answer: (amount: number) => PaystackTransaction = (amount) => ({
    status: 'ongoing',
    amount,
    currency: 'GHS',
  });
  const amounts = new Map<string, number>();
  const client = (secret: string): Paystack => ({
    chargeMomo: async (input) => {
      used.push(secret);
      amounts.set(input.reference, input.amountPesewas);
      return {
        status: 'pay_offline',
        reference: input.reference,
        display_text: 'Approve on your phone',
      };
    },
    initializeCheckout: async (input) => {
      used.push(secret);
      channels.push(input.channels);
      amounts.set(input.reference, input.amountPesewas);
      return { authorization_url: 'https://checkout.paystack.com/abc', reference: input.reference };
    },
    checkKey: async () => undefined,
    verify: async (reference) => {
      used.push(secret);
      return answer(amounts.get(reference) ?? 0);
    },
  });
  return {
    client,
    used,
    channels,
    succeed: () => (answer = (amount) => ({ status: 'success', amount, currency: 'GHS' })),
    // Paystack not answering at all.
    down: () =>
      (answer = () => {
        throw new Error('Paystack is down');
      }),
  };
}

export async function setup(options: { connect?: boolean } = {}) {
  const db = await testDb();
  await seedSamples(db);
  const fake = fakePaystack();
  const keys = venuePaystack({ db, key: TEST_KEY, client: fake.client });
  const logs: Record<string, unknown>[] = [];
  let clock = NOW;
  const service = paymentService({
    paystackFor: (slug) => keys.forVenueSlug(slug),
    store: paymentStore(db),
    siteUrl: 'https://cravins-app.vercel.app',
    now: () => clock,
  });
  const app = createApp({
    guest: {
      db,
      guestSecret: 'test-guest-secret-that-is-long-enough',
      now: () => clock,
      loyaltyKey: TEST_KEY,
    },
    payments: service,
    allowedOrigins: [],
    log: (event) => logs.push(event),
    ping: async () => undefined,
  });
  const call = async (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) => {
    const res = await app.request(`/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body === undefined
        ? {}
        : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };
  const venueId = (await call('GET', '/venues/mamas-kitchen')).json.id as string;
  if (options.connect !== false) await connectTestPaystack(db, venueId, fake.client);

  /** Scan table 12, order two of the first dish, and get a quote for the whole bill. */
  const tableBill = async (table = '12') => {
    const token = (
      await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: table })
    ).json.guestToken as string;
    const auth = { Authorization: `Bearer ${token}` };
    const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
    const order = (
      await call(
        'POST',
        '/orders',
        { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 2 }] },
        auth,
      )
    ).json;
    const quote = (
      await call('POST', `/orders/${order.id}/bill`, { mode: 'whole', tip: { percent: 10 } }, auth)
    ).json;
    return { auth, order, quote };
  };
  const momo = (quoteId: string) => ({
    quoteId,
    method: 'momo',
    momo: { phone: '+233241234567', provider: 'mtn' },
  });
  return {
    db,
    call,
    fake,
    logs,
    venueId,
    tableBill,
    momo,
    service,
    tick: (ms: number) => (clock += ms),
  };
}
