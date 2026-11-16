import { pastOrderFrom, rememberOrder, updateStatus, type PastOrder } from './orderHistory';

const order = {
  id: 'ord_1',
  number: 24,
  venueId: 'ven_bean',
  status: 'received' as const,
  totalPesewas: 3800,
  createdAt: '2026-11-16T10:00:00Z',
  source: 'pickup' as const,
  lines: [{ name: 'Flat white', quantity: 2 }],
  contact: { name: 'Ama', phone: '+233241234567' },
  deliveryAddress: '12 Oxford St',
};

test('a past order keeps what the guest saw, and never their name, phone or address', () => {
  const past = pastOrderFrom(order as never, 'bean-there', 'Bean There', 'GHS');
  expect(past).toEqual({
    orderId: 'ord_1',
    slug: 'bean-there',
    venueName: 'Bean There',
    number: 24,
    placedAt: '2026-11-16T10:00:00Z',
    totalPesewas: 3800,
    currency: 'GHS',
    items: [{ name: 'Flat white', quantity: 2 }],
    source: 'pickup',
    status: 'received',
  });
  expect(JSON.stringify(past)).not.toMatch(/Ama|233241234567|Oxford/);
});

const past = (id: string, at: string): PastOrder => ({
  ...pastOrderFrom({ ...order, id, createdAt: at } as never, 'bean-there', 'Bean There', 'GHS'),
});

test('newest first, each order once, and at most 30 kept', () => {
  let list: PastOrder[] = [];
  for (let i = 0; i < 32; i += 1)
    list = rememberOrder(list, past(`ord_${i}`, `2026-11-${10 + (i % 9)}T10:00:00Z`));
  list = rememberOrder(list, past('ord_31', '2026-11-30T10:00:00Z'));
  expect(list).toHaveLength(30);
  expect(list[0]?.orderId).toBe('ord_31');
  expect(list.filter((o) => o.orderId === 'ord_31')).toHaveLength(1);
});

test('a status seen later is saved on the order', () => {
  const list = updateStatus([past('ord_1', order.createdAt)], 'ord_1', 'ready');
  expect(list[0]?.status).toBe('ready');
  expect(updateStatus(list, 'ord_missing', 'served')).toBe(list);
});
