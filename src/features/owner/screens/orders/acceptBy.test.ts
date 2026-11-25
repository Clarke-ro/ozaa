import { acceptLeft } from './acceptBy';

const NOW = Date.parse('2026-11-25T12:00:00.000Z');
const order = (over: object = {}) => ({
  status: 'received' as const,
  acceptBy: '2026-11-25T12:04:30.000Z',
  ...over,
});

describe('acceptLeft', () => {
  test('whole minutes left, rounded up, while it waits to be accepted', () => {
    expect(acceptLeft(order(), NOW)).toEqual({ kind: 'left', minutes: 5 });
  });
  test('under a minute: accept now', () => {
    expect(acceptLeft(order({ acceptBy: '2026-11-25T12:00:40.000Z' }), NOW)).toEqual({
      kind: 'now',
    });
  });
  test('past the time: too late, the channel rejects it itself', () => {
    expect(acceptLeft(order({ acceptBy: '2026-11-25T11:59:00.000Z' }), NOW)).toEqual({
      kind: 'late',
    });
  });
  test('nothing once accepted, or for orders with no deadline', () => {
    expect(acceptLeft(order({ status: 'accepted' }), NOW)).toBeNull();
    expect(acceptLeft(order({ acceptBy: null }), NOW)).toBeNull();
    expect(acceptLeft({ status: 'received' }, NOW)).toBeNull();
  });
});
