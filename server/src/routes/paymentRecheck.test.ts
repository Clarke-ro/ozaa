import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './paymentsTestSetup.ts';

const MINUTE = 60_000;

/** A MoMo payment started on a fresh table bill, whose webhook never arrives. */
async function startedPayment() {
  const world = await setup();
  const { auth, order, quote } = await world.tableBill();
  const started = await world.call('POST', '/payments', world.momo(quote.quoteId), {
    ...auth,
    'Idempotency-Key': 'k-recheck',
  });
  const paid = async () =>
    (await world.call('GET', `/orders/${order.id}`, undefined, auth)).json.paidPesewas as number;
  return { ...world, auth, order, payment: started.json, paid };
}

test('a payment left open is checked with Paystack after 5 minutes, and a success pays the order', async () => {
  const { fake, service, tick, paid } = await startedPayment();
  fake.succeed();
  // The guest closed the page and the webhook never came. Under 5 minutes, nothing is asked yet.
  tick(4 * MINUTE);
  assert.deepEqual(await service.recheckStale(), { checked: 0, errors: 0 });
  assert.equal(await paid(), 0);

  tick(2 * MINUTE);
  assert.deepEqual(await service.recheckStale(), { checked: 1, errors: 0 });
  assert.ok((await paid()) > 0, 'the order is paid once Paystack says success');
  // Finished payments are never asked about again.
  const calls = fake.used.length;
  tick(10 * MINUTE);
  assert.deepEqual(await service.recheckStale(), { checked: 0, errors: 0 });
  assert.equal(fake.used.length, calls);
});

test('a payment is asked about at most every 5 minutes, and not after a day', async () => {
  const { fake, service, tick } = await startedPayment();
  tick(6 * MINUTE);
  // Paystack still says "ongoing": the payment stays open and waits for the next round.
  assert.deepEqual(await service.recheckStale(), { checked: 1, errors: 0 });
  tick(MINUTE);
  assert.deepEqual(await service.recheckStale(), { checked: 0, errors: 0 }, 'asked a minute ago');
  tick(5 * MINUTE);
  assert.deepEqual(await service.recheckStale(), { checked: 1, errors: 0 });

  // A day on, Paystack has long since decided; the webhook or the guest's own check covers it.
  tick(24 * 60 * MINUTE);
  const calls = fake.used.length;
  assert.deepEqual(await service.recheckStale(), { checked: 0, errors: 0 });
  assert.equal(fake.used.length, calls, 'Paystack is not asked');
});

test('Paystack being down is counted, not thrown, and the payment is tried again later', async () => {
  const { fake, service, tick, paid } = await startedPayment();
  fake.down();
  tick(6 * MINUTE);
  assert.deepEqual(await service.recheckStale(), { checked: 1, errors: 1 });
  fake.succeed();
  tick(6 * MINUTE);
  assert.deepEqual(await service.recheckStale(), { checked: 1, errors: 0 });
  assert.ok((await paid()) > 0);
});
