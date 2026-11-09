import type { Payment } from '@/lib/api/types';
import { sandboxBridge } from './mockClient';
import { signedInMock } from './testOwner';

// Phase 2b: the payment itself happens on the sandbox server, but the bill and order stay in the
// mock. The bridge hands the server the quote and puts the server's "succeeded" on the mock order.

async function orderWithQuote() {
  const { api, setGuest } = await signedInMock();
  const dish = (await api.getMenu('mamas-kitchen')).items[0];
  if (!dish) throw new Error('fixture menu is empty');
  setGuest(
    (await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '4' })).guestToken,
  );
  const order = await api.createOrder(
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] },
    { idempotencyKey: crypto.randomUUID() },
  );
  const quote = await api.quoteBill(order.id, { mode: 'whole', tip: { percent: 10 } });
  return { api, order, quote };
}

const fromServer = (over: Partial<Payment>): Payment => ({
  id: 'pay_srv',
  reference: 'pay_srv',
  orderId: '',
  method: 'momo',
  amountPesewas: 0,
  tipPesewas: 0,
  currency: 'GHS',
  status: 'pay_offline',
  approveBy: null,
  createdAt: new Date().toISOString(),
  paidAt: null,
  testMode: true,
  ...over,
});

test('the quote the server gets is the mock bill: order, venue, amount with tip', async () => {
  const { order, quote } = await orderWithQuote();
  expect(sandboxBridge.quote(quote.quoteId)).toEqual({
    orderId: order.id,
    venueSlug: 'mamas-kitchen',
    amountPesewas: quote.totalPesewas,
    tipPesewas: quote.tipPesewas,
  });
});

test('only a succeeded payment from the server marks the mock order paid', async () => {
  const { api, order, quote } = await orderWithQuote();
  const payment = fromServer({
    orderId: order.id,
    amountPesewas: quote.totalPesewas,
    tipPesewas: quote.tipPesewas,
  });

  sandboxBridge.track(payment);
  expect((await api.getOrder(order.id)).paymentStatus).toBe('unpaid');

  sandboxBridge.track({ ...payment, status: 'succeeded', paidAt: new Date().toISOString() });
  const paid = await api.getOrder(order.id);
  expect(paid.paymentStatus).toBe('paid');
  expect(paid.paidPesewas).toBe(order.totalPesewas);
});

test('an unknown quote is refused, as a changed bill', async () => {
  await orderWithQuote();
  expect(() => sandboxBridge.quote('quo_missing')).toThrow(/bill changed/);
});
