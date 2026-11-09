import { decideMockCard } from './cardBox';
import { sandboxBridge } from './mockClient';
import { signedInMock } from './testOwner';

const keys = {
  mode: 'test' as const,
  publicKey: 'pk_test_abcdef1234567890',
  secretKey: 'sk_test_abcdef1234567890',
};

/** A guest order with two different dishes, and a "My items" quote for each, first one first. */
async function twoDishesTwoQuotes() {
  const { api, setGuest } = await signedInMock();
  const venue = await api.getVenue('mamas-kitchen');
  await api.ownerConnectPaystack(venue.id, keys);
  const [first, second] = (await api.getMenu('mamas-kitchen')).items;
  if (!first || !second) throw new Error('fixture menu needs two dishes');
  setGuest(
    (await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '4' })).guestToken,
  );
  const order = await api.createOrder(
    {
      clientOrderId: crypto.randomUUID(),
      lines: [
        { menuItemId: first.id, quantity: 1 },
        { menuItemId: second.id, quantity: 1 },
      ],
    },
    { idempotencyKey: crypto.randomUUID() },
  );
  const [lineA, lineB] = order.lines;
  if (!lineA || !lineB) throw new Error('expected two lines');
  // Someone else asked for a total for dish A and didn't pay. This guest pays for dish B.
  await api.quoteBill(order.id, { mode: 'items', lineIds: [lineA.id] });
  const quoteB = await api.quoteBill(order.id, { mode: 'items', lineIds: [lineB.id] });
  return { api, order, lineA, lineB, quoteB };
}

test('a card payment marks paid the dishes in its own quote, not an older one', async () => {
  const { api, order, lineA, lineB, quoteB } = await twoDishesTwoQuotes();
  const payment = await api.initializePayment(
    { quoteId: quoteB.quoteId, method: 'card' },
    { idempotencyKey: crypto.randomUUID() },
  );
  decideMockCard(payment.reference, 'succeeded');
  expect((await api.verifyPayment(payment.reference)).status).toBe('succeeded');
  const lines = (await api.getOrder(order.id)).lines;
  expect(lines.find((l) => l.id === lineB.id)?.paid).toBe(true);
  expect(lines.find((l) => l.id === lineA.id)?.paid).toBe(false);
});

test('a sandbox server payment marks paid the dishes in its own quote', async () => {
  const { api, order, lineA, lineB, quoteB } = await twoDishesTwoQuotes();
  sandboxBridge.track(
    {
      id: 'pay_srv_items',
      reference: 'pay_srv_items',
      orderId: order.id,
      method: 'momo',
      amountPesewas: quoteB.totalPesewas,
      tipPesewas: quoteB.tipPesewas,
      currency: 'GHS',
      status: 'succeeded',
      approveBy: null,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      testMode: true,
    },
    quoteB.quoteId,
  );
  const lines = (await api.getOrder(order.id)).lines;
  expect(lines.find((l) => l.id === lineB.id)?.paid).toBe(true);
  expect(lines.find((l) => l.id === lineA.id)?.paid).toBe(false);
});
