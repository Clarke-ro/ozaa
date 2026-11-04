import { signedInMock } from './testOwner';

test('Today counts orders, pending and visits; a new scan is one more visit', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const before = await api.ownerGetDashboard(id);
  expect(before.ordersToday).toBeGreaterThanOrEqual(0);
  expect(before.pendingOrders).toBeGreaterThanOrEqual(0);
  expect(before.visitorsToday).toBeGreaterThan(0);

  await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '5' });
  const after = await api.ownerGetDashboard(id);
  expect(after.visitorsToday).toBe(before.visitorsToday + 1);
});

test('a staff order counts as today and pending', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const before = await api.ownerGetDashboard(id);
  const dish = (await api.getMenu('mamas-kitchen')).items[0]!;
  await api.ownerCreateOrder(
    id,
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] },
    { idempotencyKey: 'dash-1' },
  );
  const after = await api.ownerGetDashboard(id);
  expect(after.ordersToday).toBe(before.ordersToday + 1);
  expect(after.pendingOrders).toBe(before.pendingOrders + 1);
});
