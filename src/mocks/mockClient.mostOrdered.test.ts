import { createMockClient } from './mockClient';

// BUILD.md 5b.6b: the guest menu's "Most ordered" row comes from real orders, not the Popular badge.
test('the menu lists the dishes ordered most, and a new order can move a dish up', async () => {
  let guest: string | null = null;
  const api = createMockClient({ tokens: { guest: () => guest, access: () => 'acc_test' } });
  const before = await api.getMenu('mamas-kitchen');
  const ids = before.mostOrderedIds ?? [];
  expect(ids.length).toBeGreaterThanOrEqual(3);
  expect(ids.length).toBeLessThanOrEqual(5);
  for (const id of ids) expect(before.items.find((item) => item.id === id)?.hidden).toBeFalsy();

  // Order the last dish in the row many times over: it moves up.
  const dish = before.items.find((item) => item.id === ids[ids.length - 1])!;
  guest = (await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '4' })).guestToken;
  await api.createOrder(
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 50 }] },
    { idempotencyKey: crypto.randomUUID() },
  );
  const after = (await api.getMenu('mamas-kitchen')).mostOrderedIds ?? [];
  expect(after.indexOf(dish.id)).toBeLessThan(ids.indexOf(dish.id));
});
