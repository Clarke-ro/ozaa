import { signedInMock } from './testOwner';

test('sales counts real orders, with the sale discount fixed at order time', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const before = await api.ownerGetSales(id);
  const dish = (await api.getMenu('mamas-kitchen')).items[0]!;
  await api.ownerUpdateItem(id, dish.id, { salePricePesewas: dish.pricePesewas - 1500 });
  await api.ownerCreateOrder(
    id,
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 2 }] },
    { idempotencyKey: 'sales-1' },
  );
  const after = await api.ownerGetSales(id);
  expect(after.orderCount).toBe(before.orderCount + 1);
  expect(after.discountsPesewas - before.discountsPesewas).toBe(3000);
  expect(after.valuePesewas - before.valuePesewas).toBe((dish.pricePesewas - 1500) * 2);
  expect(after.bySource.find((row) => row.source === 'pickup')?.orders).toBe(1);
});

test('a date range with no orders is all zeros', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const empty = await api.ownerGetSales(id, { since: '2100-01-01T00:00:00Z' });
  expect(empty.orderCount).toBe(0);
  expect(empty.valuePesewas).toBe(0);
  expect(empty.days).toEqual([]);
  expect(empty.topItems).toEqual([]);
});

test('marking an order paid in person moves its value from unpaid to in person', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const dish = (await api.getMenu('mamas-kitchen')).items[0]!;
  const order = await api.ownerCreateOrder(
    id,
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] },
    { idempotencyKey: 'sales-pay-1' },
  );
  const before = (await api.ownerGetSales(id)).payments;
  await api.ownerRecordManualPayment(
    order.id,
    { method: 'cash' },
    { idempotencyKey: 'sales-pay-2' },
  );
  const after = (await api.ownerGetSales(id)).payments;
  expect(after.inPersonPesewas - before.inPersonPesewas).toBe(order.totalPesewas);
  expect(before.unpaidPesewas - after.unpaidPesewas).toBe(order.totalPesewas);
});
