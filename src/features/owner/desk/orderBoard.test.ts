import type { Order } from '@/lib/api/types';
import { PHONE_FILTERS, boardColumns, filterCounts, inFilter, isBoardColumn } from './orderBoard';

const order = (id: string, status: Order['status'], createdAt: string) =>
  ({ id, status, createdAt }) as Pick<Order, 'id' | 'status' | 'createdAt'>;

const orders = [
  order('a', 'received', '2026-11-13T08:20:00Z'),
  order('b', 'received', '2026-11-13T08:10:00Z'),
  order('c', 'preparing', '2026-11-13T08:00:00Z'),
  order('d', 'ready', '2026-11-13T07:50:00Z'),
  order('e', 'served', '2026-11-13T07:40:00Z'),
  order('f', 'cancelled', '2026-11-13T07:30:00Z'),
];

describe('order board', () => {
  it('counts open as new, cooking and ready together', () => {
    expect(filterCounts(orders)).toEqual({
      open: 4,
      new: 2,
      cooking: 1,
      ready: 1,
      served: 1,
      rejected: 1,
      all: 6,
    });
  });

  it('keeps each filter to its own orders', () => {
    expect(orders.filter((o) => inFilter(o.status, 'open')).map((o) => o.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(orders.filter((o) => inFilter(o.status, 'rejected')).map((o) => o.id)).toEqual(['f']);
    // Phones pick one kitchen stage at a time from the chips.
    expect(orders.filter((o) => inFilter(o.status, 'new')).map((o) => o.id)).toEqual(['a', 'b']);
    expect(orders.filter((o) => inFilter(o.status, 'cooking')).map((o) => o.id)).toEqual(['c']);
    expect(orders.filter((o) => inFilter(o.status, 'ready')).map((o) => o.id)).toEqual(['d']);
    expect(orders.filter((o) => inFilter(o.status, 'all'))).toHaveLength(6);
  });

  it('puts live orders in their column, oldest first', () => {
    const cols = boardColumns(orders);
    expect(cols.new.map((o) => o.id)).toEqual(['b', 'a']);
    expect(cols.cooking.map((o) => o.id)).toEqual(['c']);
    expect(cols.ready.map((o) => o.id)).toEqual(['d']);
  });
});

describe('isBoardColumn', () => {
  it('accepts the three kitchen stages from a URL', () => {
    expect(['new', 'cooking', 'ready'].every(isBoardColumn)).toBe(true);
  });

  it('turns away anything else', () => {
    expect(isBoardColumn('served')).toBe(false);
    expect(isBoardColumn('')).toBe(false);
    expect(isBoardColumn(undefined)).toBe(false);
    expect(isBoardColumn(['new'])).toBe(false);
  });
});

describe('phone order chips', () => {
  it('lists the three stages first, then the finished ones, with no Open chip', () => {
    expect(PHONE_FILTERS).toEqual(['new', 'cooking', 'ready', 'served', 'rejected', 'all']);
  });
});
