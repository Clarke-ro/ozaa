import { ownerApi } from './testOwner';

const now = Date.parse('2026-11-04T12:00:00Z');

test('staff can enter an order by hand, priced like a guest order, with or without a table', async () => {
  const api = await ownerApi(now);
  const { id } = await api.getVenue('mamas-kitchen');
  const dish = (await api.getMenu('mamas-kitchen')).items[0]!;
  const counter = await api.ownerCreateOrder(
    id,
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 2 }] },
    { idempotencyKey: 'manual-1' },
  );
  expect(counter.tableCode).toBeNull();
  expect(counter.totalPesewas).toBe(dish.pricePesewas * 2);
  expect(counter.status).toBe('received');
  const atTable = await api.ownerCreateOrder(
    id,
    {
      clientOrderId: crypto.randomUUID(),
      tableCode: '7',
      lines: [{ menuItemId: dish.id, quantity: 1 }],
    },
    { idempotencyKey: 'manual-2' },
  );
  expect(atTable.tableCode).toBe('7');
  const listed = await api.ownerListOrders(id);
  expect(listed.items.map((order) => order.id)).toEqual(
    expect.arrayContaining([counter.id, atTable.id]),
  );
});

test('sending the same order twice (a retry) makes one order', async () => {
  const api = await ownerApi(now);
  const { id } = await api.getVenue('mamas-kitchen');
  const dish = (await api.getMenu('mamas-kitchen')).items[0]!;
  const body = {
    clientOrderId: crypto.randomUUID(),
    lines: [{ menuItemId: dish.id, quantity: 1 }],
  };
  const first = await api.ownerCreateOrder(id, body, { idempotencyKey: 'same' });
  const again = await api.ownerCreateOrder(id, body, { idempotencyKey: 'same' });
  expect(again.id).toBe(first.id);
});

test('the date filter keeps orders inside since and before until', async () => {
  const api = await ownerApi(now);
  const { id } = await api.getVenue('mamas-kitchen');
  const all = (await api.ownerListOrders(id)).items;
  expect(all.length).toBeGreaterThan(0);
  const future = await api.ownerListOrders(id, { since: '2026-11-05T00:00:00.000Z' });
  expect(future.items).toEqual([]);
  const window = await api.ownerListOrders(id, {
    since: '2000-01-01T00:00:00Z',
    until: '2100-01-01T00:00:00Z',
  });
  expect(window.items.length).toBe(all.length);
});
