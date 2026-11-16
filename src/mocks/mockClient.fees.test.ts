import { ApiError } from '@/lib/api/errors';
import { passedFee } from '@/lib/paystackFee';
import { decideMockCard } from './cardBox';
import { signedInMock } from './testOwner';

// The owner can pass some or all of Paystack's fee to guests paying in the app. The mock is the
// server until Phase 5, so it adds the fee to the quote and never counts it as paying for food.

const keys = {
  mode: 'test' as const,
  publicKey: 'pk_test_abcdef1234567890',
  secretKey: 'sk_test_abcdef1234567890',
};

async function guestOrder() {
  const { api, setGuest } = await signedInMock();
  const venue = await api.getVenue('mamas-kitchen');
  await api.ownerConnectPaystack(venue.id, keys);
  const dish = (await api.getMenu('mamas-kitchen')).items[0];
  if (!dish) throw new Error('fixture menu is empty');
  setGuest(
    (await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '4' })).guestToken,
  );
  const order = await api.createOrder(
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 2 }] },
    { idempotencyKey: crypto.randomUUID() },
  );
  return { api, venue, order };
}

test('fees are off until the owner turns them on', async () => {
  const { api, venue, order } = await guestOrder();
  expect((await api.ownerGetPaymentSettings(venue.id)).feePassing?.enabled ?? false).toBe(false);
  const quote = await api.quoteBill(order.id, { mode: 'whole' });
  expect(quote.feePesewas ?? 0).toBe(0);
  expect(quote.totalPesewas).toBe(quote.sharePesewas + quote.tipPesewas);
});

test('passing the whole fee adds it to the quote and the payment', async () => {
  const { api, venue, order } = await guestOrder();
  const saved = await api.ownerSetFeePassing(venue.id, { enabled: true, percent: 100 });
  expect(saved.feePassing).toEqual({ enabled: true, percent: 100 });

  const quote = await api.quoteBill(order.id, { mode: 'whole', tip: { percent: 10 } });
  const fee = passedFee(quote.sharePesewas + quote.tipPesewas, 100);
  expect(fee).toBeGreaterThan(0);
  expect(quote.feePesewas).toBe(fee);
  expect(quote.totalPesewas).toBe(quote.sharePesewas + quote.tipPesewas + fee);

  const payment = await api.initializePayment(
    { quoteId: quote.quoteId, method: 'card' },
    { idempotencyKey: crypto.randomUUID() },
  );
  expect(payment.amountPesewas).toBe(quote.totalPesewas);
  expect(payment.feePesewas).toBe(fee);
});

test('a paid fee never counts as paying for food', async () => {
  const { api, venue, order } = await guestOrder();
  await api.ownerSetFeePassing(venue.id, { enabled: true, percent: 100 });
  const quote = await api.quoteBill(order.id, { mode: 'whole' });
  const payment = await api.initializePayment(
    { quoteId: quote.quoteId, method: 'card' },
    { idempotencyKey: crypto.randomUUID() },
  );
  decideMockCard(payment.reference, 'succeeded');
  await api.verifyPayment(payment.reference);
  const after = await api.getOrder(order.id);
  expect(after.paidPesewas).toBe(order.paidPesewas + quote.sharePesewas);
  expect(after.paidPesewas).toBeLessThanOrEqual(after.totalPesewas);
});

test('a share outside 1–100% is refused', async () => {
  const { api, venue } = await guestOrder();
  await expect(
    api.ownerSetFeePassing(venue.id, { enabled: true, percent: 0 }),
  ).rejects.toBeInstanceOf(ApiError);
  await expect(
    api.ownerSetFeePassing(venue.id, { enabled: true, percent: 101 }),
  ).rejects.toMatchObject({ status: 400 });
});

test('only the owner can change who pays the fee', async () => {
  const { api: waiter } = await signedInMock(Date.now(), '+233240000002');
  const venue = await waiter.getVenue('mamas-kitchen');
  await expect(
    waiter.ownerSetFeePassing(venue.id, { enabled: true, percent: 100 }),
  ).rejects.toMatchObject({ status: 403 });
});

test('guests see the fee share before paying, and the quote charges the same fee', async () => {
  const { api, venue, order } = await guestOrder();
  await api.ownerSetFeePassing(venue.id, { enabled: true, percent: 50 });
  const percent = (await api.getVenue(venue.slug)).payMethods?.feePercent;
  expect(percent).toBe(50);
  const quote = await api.quoteBill(order.id, { mode: 'whole' });
  expect(quote.feePesewas).toBe(passedFee(quote.sharePesewas + quote.tipPesewas, percent ?? 0));

  await api.ownerSetFeePassing(venue.id, { enabled: false, percent: 50 });
  expect((await api.getVenue(venue.slug)).payMethods).not.toHaveProperty('feePercent');
});
