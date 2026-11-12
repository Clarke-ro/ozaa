import { notificationFeed } from './notificationFeed';

const now = Date.parse('2026-11-12T12:00:00Z');
const at = (min: number) => new Date(now - min * 60_000).toISOString();

const src = {
  orders: [
    {
      id: 'o1',
      number: 31,
      tableCode: '3',
      status: 'received' as const,
      paymentStatus: 'unpaid' as const,
      createdAt: at(2),
      source: 'table' as const,
    },
    {
      id: 'o2',
      number: 30,
      tableCode: null,
      status: 'served' as const,
      paymentStatus: 'paid' as const,
      createdAt: at(50),
      source: 'pickup' as const,
    },
  ],
  calls: [
    {
      id: 'c1',
      tableCode: '4',
      reason: 'water' as const,
      status: 'open' as const,
      createdAt: at(1),
    },
    {
      id: 'c2',
      tableCode: '7',
      reason: 'bill' as const,
      status: 'resolved' as const,
      createdAt: at(30),
    },
  ],
  feedback: [
    {
      id: 'f1',
      sentiment: 'negative' as const,
      text: 'Too salty',
      archived: false,
      visibleAfter: at(10),
      createdAt: at(40),
    },
    {
      id: 'f2',
      sentiment: 'positive' as const,
      text: 'Lovely',
      archived: false,
      visibleAfter: new Date(now + 60_000).toISOString(),
      createdAt: at(5),
    },
  ],
  reviews: [],
};

test('newest first, each with where it opens and whether it still needs someone', () => {
  const feed = notificationFeed(src, now, new Set());
  expect(feed.map((n) => n.id)).toEqual(['ntf_call_c1', 'ntf_order_o1', 'ntf_bill_c2', 'ntf_note_f1', 'ntf_order_o2']);
  expect(feed[0]).toMatchObject({
    kind: 'call',
    title: 'Table 4 needs a waiter',
    needsAction: true,
    target: { type: 'call', id: 'c1' },
  });
  expect(feed[1]).toMatchObject({
    kind: 'order',
    needsAction: true,
    target: { type: 'order', id: 'o1' },
  });
  expect(feed.find((n) => n.id === 'ntf_bill_c2')).toMatchObject({
    kind: 'bill',
    needsAction: false,
  });
});

test('guest notes still inside the privacy delay are held back', () => {
  const feed = notificationFeed(src, now, new Set());
  expect(feed.some((n) => n.id === 'ntf_note_f2')).toBe(false);
});

test('read state comes from the set of ids this person read', () => {
  const feed = notificationFeed(src, now, new Set(['ntf_call_c1']));
  expect(feed[0]?.readAt).not.toBeNull();
  expect(feed[1]?.readAt).toBeNull();
});
