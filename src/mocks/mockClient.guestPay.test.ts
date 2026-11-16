import { ApiError } from '@/lib/api/errors';
import { signedInMock } from './testOwner';

// Auntie Akos is the sample that takes payment in person, with no online ordering, until its
// owner (Akosua) sets them up. Mama's Kitchen and Bean There start with both on.
const AKOSUA = '+233240000005';

// Guests can only pay in the app through the venue's own Paystack (BUILD.md 4b.17). The mock is the
// server until the real one exists, so it refuses online payment for a venue with no keys.

const keys = {
  mode: 'test' as const,
  publicKey: 'pk_test_abcdef1234567890',
  secretKey: 'sk_test_SECRETabcd9876',
};

async function guestWithQuote(connect: boolean) {
  const { api, setGuest } = await signedInMock(Date.now(), AKOSUA);
  const venue = await api.getVenue('auntie-akos');
  if (connect) await api.ownerConnectPaystack(venue.id, keys);
  const dish = (await api.getMenu('auntie-akos')).items[0];
  if (!dish) throw new Error('fixture menu is empty');
  setGuest((await api.createGuestSession({ venueSlug: 'auntie-akos', tableCode: '4' })).guestToken);
  const order = await api.createOrder(
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] },
    { idempotencyKey: crypto.randomUUID() },
  );
  const quote = await api.quoteBill(order.id, { mode: 'whole' });
  const pay = () =>
    api.initializePayment(
      { quoteId: quote.quoteId, method: 'momo', momo: { phone: '+233241234567', provider: 'mtn' } },
      { idempotencyKey: crypto.randomUUID() },
    );
  return { pay };
}

test('a venue with no Paystack connected refuses online payment', async () => {
  const { pay } = await guestWithQuote(false);
  await expect(pay()).rejects.toMatchObject({ code: 'online_pay_off', status: 409 });
  await expect(pay()).rejects.toBeInstanceOf(ApiError);
});

test('with test keys connected, MoMo starts and says it is a test payment', async () => {
  const { pay } = await guestWithQuote(true);
  const started = await pay();
  expect(started.status).toBe('pay_offline');
  expect(started.testMode).toBe(true);
});
