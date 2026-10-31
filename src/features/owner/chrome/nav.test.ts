import { navFor } from './nav';

test('kitchen only sees the order tickets', () => {
  expect(navFor('kitchen').map((item) => item.id)).toEqual(['orders']);
});

test('a waiter sees the floor, tickets and calls, and not payouts', () => {
  const ids = navFor('waiter').map((item) => item.id);
  expect(ids).toContain('floor');
  expect(ids).toContain('calls');
  expect(ids).not.toContain('payments');
  expect(ids).not.toContain('staff');
});

test('a manager sees the venue tools except payouts and staff', () => {
  const ids = navFor('manager').map((item) => item.id);
  expect(ids).toContain('menu');
  expect(ids).toContain('insights');
  expect(ids).not.toContain('payments');
  expect(ids).not.toContain('staff');
});

test('the owner sees payouts and staff', () => {
  const ids = navFor('owner').map((item) => item.id);
  expect(ids).toContain('payments');
  expect(ids).toContain('staff');
  expect(ids).toContain('setup');
});
