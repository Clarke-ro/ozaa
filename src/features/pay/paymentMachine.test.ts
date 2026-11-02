import { payInitial, payTransition } from './paymentMachine';

test('a MoMo attempt waits, then only a server success is paid', () => {
  let state = payInitial;
  state = payTransition(state, { type: 'request_quote' });
  state = payTransition(state, { type: 'quote_ready' });
  state = payTransition(state, { type: 'confirm' });
  state = payTransition(state, { type: 'momo_started', reference: 'pay_1', approveBy: 180 });
  expect(state.kind).toBe('awaiting_approval');
  state = payTransition(state, { type: 'countdown_done' });
  expect(state).toEqual({ kind: 'checking', reference: 'pay_1' });
  expect(payTransition(state, { type: 'countdown_done' }).kind).toBe('checking');
  state = payTransition(state, { type: 'server_succeeded', reference: 'pay_1' });
  expect(state).toEqual({ kind: 'paid', reference: 'pay_1' });
});

test('the countdown never marks the payment failed by itself', () => {
  const waiting = payTransition(
    { kind: 'starting' },
    { type: 'momo_started', reference: 'pay_1', approveBy: 10 },
  );
  expect(payTransition(waiting, { type: 'countdown_done' }).kind).toBe('checking');
  expect(payTransition(waiting, { type: 'server_failed', message: 'Not enough money in the wallet.' })).toEqual({
    kind: 'failed',
    message: 'Not enough money in the wallet.',
  });
});

test('a card comes back from checkout into checking', () => {
  const opening = payTransition(
    { kind: 'starting' },
    { type: 'card_started', reference: 'pay_2', url: 'https://checkout.example/pay_2' },
  );
  const checking = payTransition(opening, { type: 'returned_from_checkout' });
  expect(payTransition(checking, { type: 'verify_still_open' }).kind).toBe('timed_out');
});

test('illegal jumps stay put', () => {
  expect(payTransition(payInitial, { type: 'confirm' })).toEqual(payInitial);
  expect(payTransition({ kind: 'paid', reference: 'pay_1' }, { type: 'server_failed', message: 'no' }).kind).toBe(
    'paid',
  );
});
