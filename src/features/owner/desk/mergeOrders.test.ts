import { latestUpdatedAt, mergeOrderPages } from './mergeOrders';

const order = (id: string, createdAt: string, updatedAt = createdAt) => ({
  id,
  createdAt,
  updatedAt,
});

test('the first page is the server list', () => {
  const incoming = [order('b', '2026-11-16T12:00:00Z'), order('a', '2026-11-16T11:00:00Z')];
  expect(mergeOrderPages(null, incoming)).toEqual(incoming);
});

test('a later poll replaces an order that moved and adds a new one', () => {
  const previous = [order('a', '2026-11-16T11:00:00Z', '2026-11-16T11:00:00Z')];
  const incoming = [
    order('b', '2026-11-16T12:00:00Z', '2026-11-16T12:00:00Z'),
    order('a', '2026-11-16T11:00:00Z', '2026-11-16T12:05:00Z'),
  ];
  expect(mergeOrderPages(previous, incoming).map((item) => [item.id, item.updatedAt])).toEqual([
    ['b', '2026-11-16T12:00:00Z'],
    ['a', '2026-11-16T12:05:00Z'],
  ]);
});

test('the merged list stays at the newest 300', () => {
  const previous = Array.from({ length: 300 }, (_, index) =>
    order(`old-${index}`, new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString()),
  );
  const incoming = [order('new', '2026-11-16T12:00:00Z')];
  const merged = mergeOrderPages(previous, incoming);
  expect(merged).toHaveLength(300);
  expect(merged[0]?.id).toBe('new');
  expect(merged.some((item) => item.id === 'old-0')).toBe(false);
});

test('the watermark is the newest updatedAt', () => {
  expect(latestUpdatedAt([])).toBeUndefined();
  expect(
    latestUpdatedAt([
      { updatedAt: '2026-11-16T11:00:00Z' },
      { updatedAt: '2026-11-16T12:00:00Z' },
      {},
    ]),
  ).toBe('2026-11-16T12:00:00Z');
});
