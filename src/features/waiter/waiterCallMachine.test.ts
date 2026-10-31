import { waiterTransition } from './waiterCallMachine';

test('staff can finish a call with or without saying they are on the way', () => {
  expect(waiterTransition('open', 'acknowledge')).toBe('acknowledged');
  expect(waiterTransition('acknowledged', 'resolve')).toBe('resolved');
  expect(waiterTransition('open', 'resolve')).toBe('resolved');
  expect(waiterTransition('resolved', 'acknowledge')).toBeNull();
});
