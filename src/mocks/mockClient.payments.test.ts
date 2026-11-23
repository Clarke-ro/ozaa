import { ApiError } from '@/lib/api/errors';
import { decideMockCard } from './cardBox';
import { signedInMock } from './testOwner';

// Auntie Akos is the sample that takes payment in person, with no online ordering, until its
// owner (Akosua) sets them up. Mama's Kitchen and Bean There start with both on.
const AKOSUA = '+233240000005';

const keys = {
  mode: 'test' as const,
  publicKey: 'pk_test_abcdef1234567890',
  secretKey: 'sk_test_SECRETabcd9876',
};

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    return error instanceof ApiError ? error.code : String(error);
  }
}

test('connecting Paystack never sends the secret key back, anywhere', async () => {
  const { api } = await signedInMock(Date.now(), AKOSUA);
  const { id } = await api.getVenue('auntie-akos');
  const before = await api.ownerGetPaymentSettings(id);
  expect(before.paystack).toBeNull();
  const saved = await api.ownerConnectPaystack(id, keys);
  expect(saved.paystack?.secretKeyHint).toBe('••••9876');
  const everything = JSON.stringify([
    saved,
    await api.ownerGetPaymentSettings(id),
    await api.getVenue('auntie-akos'),
    await api.ownerGetVenue(id),
    await api.ownerTestPaystack(id),
  ]);
  expect(everything).not.toContain('SECRET');
  expect(everything).not.toContain('sk_test');
});

test('guests learn they can pay online once Paystack is connected, and that it is a test', async () => {
  const { api } = await signedInMock(Date.now(), AKOSUA);
  const { id } = await api.getVenue('auntie-akos');
  expect((await api.getVenue('auntie-akos')).payMethods?.online).toBe(false);
  await api.ownerConnectPaystack(id, keys);
  const methods = (await api.getVenue('auntie-akos')).payMethods;
  expect(methods?.online).toBe(true);
  expect(methods?.testMode).toBe(true);
  await api.ownerDisconnectPaystack(id);
  expect((await api.getVenue('auntie-akos')).payMethods?.online).toBe(false);
});

test('live keys, swapped keys and staff other than the owner are refused', async () => {
  const { api } = await signedInMock(Date.now(), AKOSUA);
  const { id } = await api.getVenue('auntie-akos');
  const live = {
    mode: 'live' as const,
    publicKey: 'pk_live_abcdef1234567890',
    secretKey: 'sk_live_abcdef1234567890',
  };
  expect(await codeOf(api.ownerConnectPaystack(id, live))).toBe('live_not_enabled');
  expect(
    await codeOf(
      api.ownerConnectPaystack(id, {
        ...keys,
        publicKey: keys.secretKey,
        secretKey: keys.publicKey,
      }),
    ),
  ).toBe('paystack_keys_invalid');
  const waiter = (await signedInMock(Date.now(), '+233240000002')).api;
  expect(await codeOf(waiter.ownerGetPaymentSettings(id))).toBe('forbidden');
  expect(await codeOf(waiter.ownerConnectPaystack(id, keys))).toBe('forbidden');
});

test('manual methods need their details, then guests see them', async () => {
  const { api } = await signedInMock(Date.now(), AKOSUA);
  const { id } = await api.getVenue('auntie-akos');
  const manual = {
    cash: true,
    cardMachine: true,
    bankTransfer: { enabled: false },
    momo: { enabled: true, network: 'mtn' as const },
  };
  expect(await codeOf(api.ownerSetManualPayments(id, manual))).toBe('manual_momo_incomplete');
  await api.ownerSetManualPayments(id, {
    ...manual,
    momo: { ...manual.momo, number: '+233241234567', name: 'Mama K' },
  });
  const methods = (await api.getVenue('auntie-akos')).payMethods;
  expect(methods?.cardMachine).toBe(true);
  expect(methods?.momo).toEqual({ network: 'mtn', number: '+233241234567', name: 'Mama K' });
});

test('after part of the bill is paid, paying the whole bill asks only for what is left', async () => {
  const { api, setGuest } = await signedInMock(Date.now(), AKOSUA);
  const { id } = await api.getVenue('auntie-akos');
  await api.ownerConnectPaystack(id, keys);
  const dish = (await api.getMenu('auntie-akos')).items[0]!;
  setGuest((await api.createGuestSession({ venueSlug: 'auntie-akos', tableCode: '4' })).guestToken);
  const order = await api.createOrder(
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 2 }] },
    { idempotencyKey: crypto.randomUUID() },
  );
  // One friend pays half by card: money on the order, but no dish marked paid.
  const half = await api.quoteBill(order.id, { mode: 'equal', parts: 2 });
  const payment = await api.initializePayment(
    { quoteId: half.quoteId, method: 'card' },
    { idempotencyKey: crypto.randomUUID() },
  );
  decideMockCard(payment.reference, 'succeeded');
  expect((await api.verifyPayment(payment.reference)).status).toBe('succeeded');
  const quote = await api.quoteBill(order.id, { mode: 'whole' });
  expect(quote.sharePesewas).toBe(order.totalPesewas - half.sharePesewas);
  expect(quote.remainingAfterPesewas).toBe(0);
});

test('staff mark an order paid by method; doing it twice changes nothing; the kitchen cannot', async () => {
  const { api } = await signedInMock(Date.now(), AKOSUA);
  const { id } = await api.getVenue('auntie-akos');
  const dish = (await api.getMenu('auntie-akos')).items[0]!;
  const order = await api.ownerCreateOrder(
    id,
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] },
    { idempotencyKey: 'pay-1' },
  );
  const paid = await api.ownerRecordManualPayment(
    order.id,
    { method: 'card_machine' },
    { idempotencyKey: 'mp-1' },
  );
  expect(paid.paymentStatus).toBe('paid');
  expect(paid.paymentMethod).toBe('card_machine');
  expect(paid.paidPesewas).toBe(order.totalPesewas);
  const again = await api.ownerRecordManualPayment(
    order.id,
    { method: 'cash' },
    { idempotencyKey: 'mp-2' },
  );
  expect(again.paymentMethod).toBe('card_machine');
  const kitchen = (await signedInMock(Date.now(), '+233240000003')).api;
  expect(await codeOf(kitchen.ownerRecordManualPayment(order.id, { method: 'cash' }))).toBe(
    'forbidden',
  );
});

test('MoMo without a phone opens the checkout page, like card (Clarke, 2026-11-23)', async () => {
  const { api, setGuest } = await signedInMock(Date.now(), AKOSUA);
  const { id } = await api.getVenue('auntie-akos');
  await api.ownerConnectPaystack(id, keys);
  const dish = (await api.getMenu('auntie-akos')).items[0]!;
  setGuest((await api.createGuestSession({ venueSlug: 'auntie-akos', tableCode: '4' })).guestToken);
  const order = await api.createOrder(
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] },
    { idempotencyKey: crypto.randomUUID() },
  );
  const quote = await api.quoteBill(order.id, { mode: 'whole' });
  const payment = await api.initializePayment(
    { quoteId: quote.quoteId, method: 'momo' },
    { idempotencyKey: crypto.randomUUID() },
  );
  expect(payment.status).toBe('open_url');
  expect(payment.method).toBe('momo');
  expect(payment.authorizationUrl).toBeTruthy();
  expect(payment.displayText).toBeUndefined();
  decideMockCard(payment.reference, 'succeeded');
  expect((await api.verifyPayment(payment.reference)).status).toBe('succeeded');
});
