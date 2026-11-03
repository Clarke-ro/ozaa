import { orderToast, orderTransition, showsFoodReady } from './orderMachine';

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

describe('orderToast', () => {
  it('shows a quiet "in progress" toast while the kitchen has the order', () => {
    expect(orderToast('received')).toBe('working');
    expect(orderToast('preparing')).toBe('working');
  });

  it('shows the ready toast only when the kitchen marks it ready', () => {
    expect(orderToast('ready')).toBe('ready');
  });

  it('shows nothing once the order is served or cancelled', () => {
    expect(orderToast('served')).toBeNull();
    expect(orderToast('cancelled')).toBeNull();
  });
});
