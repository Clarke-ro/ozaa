import { ApiError } from '@/lib/api/errors';
import { createMockClient } from './mockClient';

// The mock is the server until the real one exists, so it must keep the same money and stock rules.
async function venueWithDish(
  change: Parameters<ReturnType<typeof createMockClient>['ownerUpdateItem']>[2],
) {
  let guest: string | null = null;
  const api = createMockClient({ tokens: { guest: () => guest, access: () => 'acc_test' } });
  const venue = await api.getVenue('mamas-kitchen');
  const dish = (await api.getMenu('mamas-kitchen')).items[0];
  if (!dish) throw new Error('fixture menu is empty');
  await api.ownerUpdateItem(venue.id, dish.id, change);
  guest = (await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '4' })).guestToken;
  const order = (quantity: number) =>
    api.createOrder(
      { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity }] },
      { idempotencyKey: crypto.randomUUID() },
    );
  const reload = async () =>
    (await api.getMenu('mamas-kitchen')).items.find((item) => item.id === dish.id);
  return { order, reload };
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error instanceof ApiError ? error.code : String(error);
  }
}

test('a sale price is what the order charges', async () => {
  const { order } = await venueWithDish({ pricePesewas: 5000, salePricePesewas: 4000 });
  const placed = await order(2);
  expect(placed.lines[0]?.unitPricePesewas).toBe(4000);
  expect(placed.totalPesewas).toBe(8000);
});

test('stock goes down with each order and the last one sells the dish out', async () => {
  const { order, reload } = await venueWithDish({ stockCount: 3 });
  await order(2);
  expect((await reload())?.stockCount).toBe(1);
  expect(await codeOf(order(2))).toBe('item_sold_out');
  await order(1);
  const after = await reload();
  expect(after?.stockCount).toBe(0);
  expect(after?.available).toBe(false);
});

test('an order outside the owner min and max is refused', async () => {
  const { order } = await venueWithDish({ minQuantity: 2, maxQuantity: 4 });
  expect(await codeOf(order(1))).toBe('quantity_out_of_range');
  expect(await codeOf(order(5))).toBe('quantity_out_of_range');
  expect((await order(3)).lines[0]?.quantity).toBe(3);
});

test('a hidden dish cannot be ordered', async () => {
  const { order } = await venueWithDish({ hidden: true });
  expect(await codeOf(order(1))).toBe('item_sold_out');
});
