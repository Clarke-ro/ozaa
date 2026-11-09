import { buildNotifications, needsYou, unseenCount, type NoteSources } from './notifications';

const now = Date.parse('2026-11-02T12:00:00Z');
const at = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

const empty: NoteSources = {
  orders: [],
  calls: [],
  feedback: [],
  staff: [],
  alerts: [],
};

describe('buildNotifications', () => {
  it('turns new orders, open calls, notes, payments and joins into one list, newest first', () => {
    const notes = buildNotifications(
      {
        ...empty,
        orders: [
          {
            id: 'o1',
            number: 25,
            tableCode: '3',
            status: 'received',
            createdAt: at(4),
            readyAt: null,
          },
        ],
        calls: [{ id: 'c1', tableCode: '4', reason: 'water', status: 'open', createdAt: at(1) }],
        feedback: [
          {
            id: 'f1',
            sentiment: 'negative',
            score: 2,
            archived: false,
            visibleAfter: at(30),
            createdAt: at(150),
          },
        ],
        staff: [{ id: 's1', firstName: 'Kwesi', status: 'active', joinedAt: at(60 * 24) }],
      },
      now,
    );
    expect(notes.map((n) => n.kind)).toEqual([
      'call',
      'order',
      'feedback',
      'staff_joined',
    ]);
    expect(notes[0]).toMatchObject({ href: '/owner/calls', tone: 'alert' });
    expect(notes.find((n) => n.kind === 'feedback')?.tone).toBe('alert');
  });

  it('leaves out what needs nothing: served orders, answered calls, archived or hidden notes', () => {
    const notes = buildNotifications(
      {
        ...empty,
        orders: [
          {
            id: 'o1',
            number: 1,
            tableCode: '1',
            status: 'served',
            createdAt: at(5),
            readyAt: at(3),
          },
        ],
        calls: [{ id: 'c1', tableCode: '1', reason: 'bill', status: 'resolved', createdAt: at(5) }],
        feedback: [
          {
            id: 'f1',
            sentiment: 'positive',
            score: 5,
            archived: true,
            visibleAfter: at(9),
            createdAt: at(200),
          },
          // Still inside the 2-hour privacy delay, so the owner must not see it yet.
          {
            id: 'f2',
            sentiment: 'positive',
            score: 5,
            archived: false,
            visibleAfter: at(-30),
            createdAt: at(90),
          },
        ],
        staff: [{ id: 's1', firstName: 'Old', status: 'active', joinedAt: at(60 * 24 * 30) }],
      },
      now,
    );
    expect(notes).toEqual([]);
  });

  it('pins dashboard alerts (sold out, payout) above everything, with no time', () => {
    const notes = buildNotifications(
      {
        ...empty,
        calls: [{ id: 'c1', tableCode: '4', reason: 'water', status: 'open', createdAt: at(1) }],
        alerts: [
          { code: 'sold_out', detail: 'Kelewele' },
          { code: 'payout' },
          { code: 'calls', count: 1 },
        ],
      },
      now,
    );
    expect(notes.map((n) => n.kind)).toEqual(['sold_out', 'payout', 'call']);
    expect(notes[0]?.at).toBeNull();
  });
});

describe('unseenCount', () => {
  it('counts pinned alerts plus anything newer than the last visit', () => {
    const notes = buildNotifications(
      {
        ...empty,
        alerts: [{ code: 'payout' }],
        calls: [
          { id: 'c1', tableCode: '4', reason: 'water', status: 'open', createdAt: at(1) },
          { id: 'c2', tableCode: '5', reason: 'bill', status: 'open', createdAt: at(20) },
        ],
      },
      now,
    );
    expect(unseenCount(notes, now - 10 * 60_000)).toBe(2);
    expect(unseenCount(notes, null)).toBe(3);
  });
});

describe('urgent items (the Needs you section)', () => {
  it('flags orders waiting 20 minutes or more as late, and keeps fresh ones as plain news', () => {
    const notes = buildNotifications(
      {
        ...empty,
        orders: [
          {
            id: 'o1',
            number: 30,
            tableCode: '2',
            status: 'received',
            createdAt: at(25),
            readyAt: null,
          },
          {
            id: 'o2',
            number: 31,
            tableCode: '6',
            status: 'preparing',
            createdAt: at(21),
            readyAt: null,
          },
          {
            id: 'o3',
            number: 32,
            tableCode: '7',
            status: 'received',
            createdAt: at(3),
            readyAt: null,
          },
        ],
      },
      now,
    );
    expect(notes.map((n) => [n.kind, n.tone])).toEqual([
      ['order', 'info'],
      ['order_late', 'alert'],
      ['order_late', 'alert'],
    ]);
  });

  it('pins tables waiting to pay with their count', () => {
    const notes = buildNotifications({ ...empty, alerts: [{ code: 'bills', count: 2 }] }, now);
    expect(notes).toEqual([
      expect.objectContaining({
        kind: 'bills',
        at: null,
        tone: 'alert',
        href: '/owner/floor',
        vars: { count: 2 },
      }),
    ]);
  });

  it('needsYou keeps only the urgent ones, pinned first', () => {
    const notes = buildNotifications(
      {
        ...empty,
        alerts: [{ code: 'payout' }],
        calls: [{ id: 'c1', tableCode: '4', reason: 'water', status: 'open', createdAt: at(1) }],
      },
      now,
    );
    expect(needsYou(notes).map((n) => n.kind)).toEqual(['payout', 'call']);
  });
});
