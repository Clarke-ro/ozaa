import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Paystack } from './paystack.ts';
import { paymentStore } from './db/paymentStore.ts';
import { testDb } from './db/testDb.ts';
import { paymentService } from './payments.ts';
import type { PaystackTransaction } from './status.ts';

const charge = { orderId: 'ord_1', venueSlug: 'bean-there', quoteId: null, amountPesewas: 14_300, tipPesewas: 1_300, feePesewas: 0 };

function fakePaystack(verify: () => PaystackTransaction) {
  const calls: string[] = [];
  const paystack: Paystack = {
    chargeMomo: async (input) => {
      calls.push(`charge ${input.phone} ${input.provider} ${input.amountPesewas}`);
      return { status: 'pay_offline', reference: input.reference, display_text: 'Approve on your phone' };
    },
    initializeCard: async (input) => {
      calls.push(`card ${input.callbackUrl}`);
      return { authorization_url: 'https://checkout.paystack.com/abc', reference: input.reference };
    },
    verify: async () => {
      calls.push('verify');
      return verify();
    },
  };
  return { paystack, calls };
}

async function service(verify: () => PaystackTransaction, start = 0) {
  let clock = start;
  const fake = fakePaystack(verify);
  const svc = paymentService({
    paystackFor: async () => ({ paystack: fake.paystack, secret: 'sk_test_venue', testMode: true }),
    store: paymentStore(await testDb()),
    siteUrl: 'https://cravins-app.vercel.app/',
    now: () => clock,
    newReference: () => 'pay_1',
  });
  return { svc, calls: fake.calls, tick: (ms: number) => (clock += ms) };
}

const pending = () => ({ status: 'ongoing', amount: 14_300, currency: 'GHS' });

test('MoMo starts pay_offline with 180 seconds to approve', async () => {
  const { svc, calls } = await service(pending);
  const p = await svc.start(
    { charge, method: 'momo', momo: { phone: '+233241234567', provider: 'mtn' } },
    'key-1',
  );
  assert.equal(p.status, 'pay_offline');
  assert.equal(p.displayText, 'Approve on your phone');
  assert.equal(p.approveBy, new Date(180_000).toISOString());
  assert.equal(p.testMode, true);
  assert.deepEqual(calls, ['charge +233241234567 mtn 14300']);
});

test('a card goes to Paystack checkout and comes back to the venue pay page', async () => {
  const { svc, calls } = await service(pending);
  const p = await svc.start({ charge, method: 'card' }, 'key-1');
  assert.equal(p.status, 'open_url');
  assert.equal(p.authorizationUrl, 'https://checkout.paystack.com/abc');
  assert.equal(p.approveBy, null);
  assert.deepEqual(calls, ['card https://cravins-app.vercel.app/bean-there/pay']);
});

test('the same Idempotency-Key never charges twice', async () => {
  const { svc, calls } = await service(pending);
  const input = { charge, method: 'momo' as const, momo: { phone: '+233241234567', provider: 'mtn' as const } };
  const a = await svc.start(input, 'key-1');
  const b = await svc.start(input, 'key-1');
  assert.equal(a.reference, b.reference);
  assert.equal(calls.length, 1);
});

test('verify with Paystack success and the right amount is paid', async () => {
  const { svc } = await service(() => ({ status: 'success', amount: 14_300, currency: 'GHS' }));
  await svc.start({ charge, method: 'card' }, 'key-1');
  const p = await svc.verify('pay_1');
  assert.equal(p?.status, 'succeeded');
  assert.ok(p?.paidAt);
});

test('a success for another amount is never paid', async () => {
  const { svc } = await service(() => ({ status: 'success', amount: 100, currency: 'GHS' }));
  await svc.start({ charge, method: 'card' }, 'key-1');
  const p = await svc.verify('pay_1');
  assert.equal(p?.status, 'failed');
});

test('GET asks Paystack again only every few seconds while the payment is open', async () => {
  const { svc, calls, tick } = await service(pending);
  await svc.start({ charge, method: 'momo', momo: { phone: '+233241234567', provider: 'mtn' } }, 'key-1');
  await svc.get('pay_1');
  tick(4_000);
  await svc.get('pay_1');
  assert.equal(calls.filter((c) => c === 'verify').length, 0);
  tick(1_000);
  await svc.get('pay_1');
  assert.equal(calls.filter((c) => c === 'verify').length, 1);
});

test('a finished payment never changes again, whatever comes later', async () => {
  let answer: PaystackTransaction = { status: 'success', amount: 14_300, currency: 'GHS' };
  const { svc } = await service(() => answer);
  await svc.start({ charge, method: 'card' }, 'key-1');
  await svc.verify('pay_1');
  answer = { status: 'failed', amount: 14_300, currency: 'GHS' };
  assert.equal((await svc.verify('pay_1'))?.status, 'succeeded');
  assert.equal((await svc.fromWebhook('pay_1', answer))?.status, 'succeeded');
});

test('an unknown reference is null, and webhooks for it are ignored', async () => {
  const { svc } = await service(pending);
  assert.equal(await svc.get('nope'), null);
  assert.equal(await svc.fromWebhook('nope', pending()), null);
});

test('a card payer who came back early and then paid is still paid', async () => {
  let answer: PaystackTransaction = { status: 'abandoned', amount: 14_300, currency: 'GHS' };
  const { svc } = await service(() => answer);
  await svc.start({ charge, method: 'card' }, 'key-1');
  // Back in the app before paying: Paystack says abandoned.
  assert.equal((await svc.verify('pay_1'))?.status, 'abandoned');
  // They go back to Paystack's page and pay. The money moved, so the payment must count.
  answer = { status: 'success', amount: 14_300, currency: 'GHS' };
  assert.equal((await svc.fromWebhook('pay_1', answer))?.status, 'succeeded');
});

test('after abandoned, a success for the wrong amount is still not paid', async () => {
  const { svc } = await service(() => ({ status: 'abandoned', amount: 14_300, currency: 'GHS' }));
  await svc.start({ charge, method: 'card' }, 'key-1');
  await svc.verify('pay_1');
  const late = await svc.fromWebhook('pay_1', { status: 'success', amount: 100, currency: 'GHS' });
  assert.equal(late?.status, 'failed');
});

test('two taps at the same moment with one Idempotency-Key charge once', async () => {
  const { svc, calls } = await service(pending);
  const input = { charge, method: 'momo' as const, momo: { phone: '+233241234567', provider: 'mtn' as const } };
  const [a, b] = await Promise.all([svc.start(input, 'key-1'), svc.start(input, 'key-1')]);
  assert.equal(a.reference, b.reference);
  assert.equal(calls.length, 1);
});
