import { buildGuestNotes, unseenGuestNotes } from './guestNotes';

const now = Date.parse('2026-11-02T12:00:00Z');
const at = (m: number) => new Date(now - m * 60_000).toISOString();
const order = (
  status: 'received' | 'preparing' | 'ready' | 'served',
  extra: { readyAt?: string } = {},
) => ({
  id: 'o1',
  number: 24,
  status,
  createdAt: at(20),
  updatedAt: at(5),
  readyAt: null as string | null,
  ...extra,
});

describe('guest notifications', () => {
  it('tells the story of the order, newest first', () => {
    const notes = buildGuestNotes({ order: order('ready', { readyAt: at(2) }), calls: [] });
    expect(notes.map((n) => n.kind)).toEqual(['order_ready', 'order_sent']);
    expect(notes[0]).toMatchObject({ at: at(2), href: 'status', vars: { number: 24 } });
  });

  it('adds "being prepared" while the kitchen has it, and served at the end', () => {
    expect(buildGuestNotes({ order: order('preparing'), calls: [] }).map((n) => n.kind)).toEqual([
      'order_cooking',
      'order_sent',
    ]);
    expect(buildGuestNotes({ order: order('served'), calls: [] }).map((n) => n.kind)).toEqual([
      'order_served',
      'order_sent',
    ]);
  });

  it('includes waiter calls: sent, and who is coming once picked up', () => {
    const notes = buildGuestNotes({
      order: null,
      calls: [
        {
          id: 'c1',
          reason: 'water',
          status: 'acknowledged',
          createdAt: at(4),
          acknowledgedAt: at(3),
          staffFirstName: 'Esi',
        },
      ],
    });
    expect(notes.map((n) => [n.kind, n.href])).toEqual([
      ['call_coming', 'waiter'],
      ['call_sent', 'waiter'],
    ]);
    expect(notes[0]?.vars).toMatchObject({ name: 'Esi', reason: 'water' });
  });

  it('counts what came after the last visit', () => {
    const notes = buildGuestNotes({ order: order('ready', { readyAt: at(2) }), calls: [] });
    expect(unseenGuestNotes(notes, null)).toBe(2);
    expect(unseenGuestNotes(notes, Date.parse(at(10)))).toBe(1);
  });
});

it('puts the later step first when two updates share a time', () => {
  const same = '2026-11-02T11:59:00Z';
  const notes = buildGuestNotes({
    order: {
      id: 'o1',
      number: 24,
      status: 'preparing',
      createdAt: same,
      updatedAt: same,
      readyAt: null,
    },
    calls: [],
  });
  expect(notes.map((n) => n.kind)).toEqual(['order_cooking', 'order_sent']);
});
