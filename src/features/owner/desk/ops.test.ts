import {
  averageResponseMinutes,
  orderTab,
  orderTabCounts,
  ticketAge,
} from './ops';

test('orders sort into New, Cooking, Ready and Done', () => {
  expect(orderTab('received')).toBe('new');
  expect(orderTab('preparing')).toBe('cooking');
  expect(orderTab('ready')).toBe('ready');
  expect(orderTab('served')).toBe('served');
  expect(orderTab('cancelled')).toBe('rejected');
});

test('average response uses only calls someone picked up, rounded to whole minutes', () => {
  const at = (m: number) => new Date(Date.UTC(2026, 10, 2, 12, m)).toISOString();
  expect(
    averageResponseMinutes([
      { createdAt: at(0), acknowledgedAt: at(2) },
      { createdAt: at(10), acknowledgedAt: at(14) },
      { createdAt: at(20), acknowledgedAt: null },
    ]),
  ).toBe(3);
  expect(averageResponseMinutes([{ createdAt: at(0), acknowledgedAt: null }])).toBeNull();
});

describe('ticketAge', () => {
  const sent = '2026-11-02T12:00:00Z';
  const at = (minutes: number) => Date.parse(sent) + minutes * 60_000;

  it('counts whole minutes since the order came in', () => {
    expect(ticketAge(sent, at(0)).minutes).toBe(0);
    expect(ticketAge(sent, at(7.9)).minutes).toBe(7);
  });

  it('is on time under 10 minutes, late from 10, very late from 20', () => {
    expect(ticketAge(sent, at(9)).tone).toBe('ok');
    expect(ticketAge(sent, at(10)).tone).toBe('late');
    expect(ticketAge(sent, at(19)).tone).toBe('late');
    expect(ticketAge(sent, at(20)).tone).toBe('very_late');
  });

  it('never goes below zero when the phone clock is behind the server', () => {
    expect(ticketAge(sent, at(-3))).toEqual({ minutes: 0, tone: 'ok' });
  });
});

test('order tab counts cover every tab, and All counts every order', () => {
  const statuses = ['received', 'received', 'preparing', 'served', 'cancelled'] as const;
  const counts = orderTabCounts(statuses.map((status) => ({ status })));
  expect(counts).toEqual({ new: 2, cooking: 1, ready: 0, served: 1, rejected: 1, all: 5 });
});
