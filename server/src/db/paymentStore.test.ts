import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Payment } from '../payments.ts';
import { paymentStore } from './paymentStore.ts';
import { testDb } from './testDb.ts';

const base: Payment = {
  id: 'pay_1',
  reference: 'pay_1',
  orderId: 'ord_1',
  method: 'momo',
  provider: 'mtn',
  amountPesewas: 14300,
  feePesewas: 0,
  tipPesewas: 1300,
  currency: 'GHS',
  status: 'pending',
  approveBy: '2026-11-16T10:03:00.000Z',
  createdAt: '2026-11-16T10:00:00.000Z',
  paidAt: null,
  testMode: true,
};

test('claims a new key once, and gives back the same payment for the same key', async () => {
  const store = paymentStore(await testDb());
  const first = await store.claim('key-1', base, 'bean-there');
  assert.equal(first.created, true);
  const again = await store.claim('key-1', { ...base, id: 'pay_2', reference: 'pay_2' }, 'bean-there');
  assert.equal(again.created, false);
  assert.equal(again.payment.reference, 'pay_1');
});

test('two taps at the same moment still make one payment', async () => {
  const store = paymentStore(await testDb());
  const [a, b] = await Promise.all([
    store.claim('key-2', base, 'bean-there'),
    store.claim('key-2', { ...base, id: 'pay_2', reference: 'pay_2' }, 'bean-there'),
  ]);
  assert.equal([a, b].filter((r) => r.created).length, 1);
  assert.equal(a.payment.reference, b.payment.reference);
});

test('saves changes and reads them back exactly, with when Paystack was last asked', async () => {
  const store = paymentStore(await testDb());
  await store.claim('key-3', base, 'bean-there');
  const paid: Payment = { ...base, status: 'succeeded', paidAt: '2026-11-16T10:01:00.000Z', displayText: 'Approve on your phone' };
  await store.save(paid);
  await store.asked('pay_1', Date.parse('2026-11-16T10:01:00Z'));
  const found = await store.get('pay_1');
  assert.deepEqual(found?.payment, paid);
  assert.equal(found?.lastAskedAt, Date.parse('2026-11-16T10:01:00Z'));
  assert.equal(await store.get('pay_missing'), null);
});

test('refuses a payment of zero or less', async () => {
  const store = paymentStore(await testDb());
  await assert.rejects(store.claim('key-4', { ...base, amountPesewas: 0 }, 'bean-there'));
});
