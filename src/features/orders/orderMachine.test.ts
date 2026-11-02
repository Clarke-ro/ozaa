import { orderTransition, showsFoodReady } from './orderMachine';

test('kitchen can move a ticket forward and cannot cancel it', () => {
  expect(orderTransition('received', 'start', 'kitchen')).toBe('preparing');
  expect(orderTransition('preparing', 'ready', 'kitchen')).toBe('ready');
  expect(orderTransition('preparing', 'cancel', 'kitchen')).toBeNull();
  expect(orderTransition('ready', 'serve', 'waiter')).toBe('served');
});

test('a served order stays served', () => {
  expect(orderTransition('served', 'cancel', 'owner')).toBeNull();
  expect(orderTransition('received', 'serve', 'owner')).toBeNull();
});

test('the guest food-ready banner shows only while the kitchen has marked the order ready', () => {
  expect(showsFoodReady('ready')).toBe(true);
  expect(showsFoodReady('preparing')).toBe(false);
  expect(showsFoodReady('served')).toBe(false);
  expect(showsFoodReady('received')).toBe(false);
});
