import {
  moveFor,
  nextOrderMove,
  orderToast,
  orderTransition,
  showsFoodReady,
} from './orderMachine';

test('a new order is accepted before the kitchen can start it', () => {
  expect(orderTransition('received', 'start', 'kitchen')).toBeNull();
  expect(orderTransition('received', 'accept', 'kitchen')).toBe('accepted');
  expect(orderTransition('received', 'accept', 'waiter')).toBe('accepted');
  expect(orderTransition('accepted', 'start', 'kitchen')).toBe('preparing');
  expect(orderTransition('accepted', 'start', 'waiter')).toBeNull();
  expect(orderTransition('received', 'accept', 'viewer')).toBeNull();
});

test('the next button: Accept on a new order, then Start cooking', () => {
  expect(nextOrderMove('received', 'owner')).toEqual({ move: 'accept', status: 'accepted' });
  expect(nextOrderMove('accepted', 'owner')).toEqual({ move: 'start', status: 'preparing' });
  expect(nextOrderMove('accepted', 'waiter')).toBeNull();
});

test('an accepted order can still be cancelled by an owner', () => {
  expect(orderTransition('accepted', 'cancel', 'owner')).toBe('cancelled');
  expect(orderTransition('accepted', 'cancel', 'kitchen')).toBeNull();
});

test('kitchen can move a ticket forward and cannot cancel it', () => {
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
    expect(orderToast('accepted')).toBe('working');
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

test('the move that reaches each status, for a server asked to set one', () => {
  expect(moveFor('accepted')).toBe('accept');
  expect(moveFor('preparing')).toBe('start');
  expect(moveFor('cancelled')).toBe('cancel');
  expect(moveFor('received')).toBeNull();
});
