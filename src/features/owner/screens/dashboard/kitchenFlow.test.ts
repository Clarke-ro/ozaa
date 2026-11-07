import type { Order } from '@/lib/api/types';
import { kitchenFlow } from './kitchenFlow';

const NOW = Date.UTC(2026, 10, 2, 12, 30);
// An order placed `m` minutes before NOW.
const ago = (m: number) => new Date(NOW - m * 60_000).toISOString();
const order = (id: string, status: Order['status'], minutes: number) => ({
  id,
  status,
  createdAt: ago(minutes),
});

test('no orders: three empty stages and nothing open', () => {
  const flow = kitchenFlow([], NOW);
  expect(flow.stages).toEqual([
    { id: 'new', count: 0, oldestMinutes: null, tone: null },
    { id: 'cooking', count: 0, oldestMinutes: null, tone: null },
    { id: 'ready', count: 0, oldestMinutes: null, tone: null },
  ]);
  expect(flow.open).toEqual([]);
});

test('counts each stage and keeps the oldest wait in each', () => {
  const flow = kitchenFlow(
    [
      order('a', 'received', 3),
      order('b', 'received', 12),
      order('c', 'preparing', 25),
      order('d', 'preparing', 1),
      order('e', 'ready', 0),
    ],
    NOW,
  );
  expect(flow.stages).toEqual([
    { id: 'new', count: 2, oldestMinutes: 12, tone: 'late' },
    { id: 'cooking', count: 2, oldestMinutes: 25, tone: 'very_late' },
    { id: 'ready', count: 1, oldestMinutes: 0, tone: 'ok' },
  ]);
});

test('served and cancelled orders are left out of the stages and the open list', () => {
  const flow = kitchenFlow(
    [order('a', 'served', 40), order('b', 'cancelled', 30), order('c', 'received', 2)],
    NOW,
  );
  expect(flow.open.map((o) => o.id)).toEqual(['c']);
  expect(flow.stages.map((s) => s.count)).toEqual([1, 0, 0]);
  expect(flow.stages[0]?.oldestMinutes).toBe(2);
});

test('open tickets are oldest first, whatever their stage', () => {
  const flow = kitchenFlow(
    [
      order('young', 'received', 1),
      order('oldest', 'ready', 30),
      order('middle', 'preparing', 9),
    ],
    NOW,
  );
  expect(flow.open.map((o) => o.id)).toEqual(['oldest', 'middle', 'young']);
});

test('keeps the caller order objects, so the screen still has every field', () => {
  const full = { ...order('a', 'received', 5), number: 7 };
  expect(kitchenFlow([full], NOW).open[0]).toBe(full);
});
