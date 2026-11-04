import { arrivals, chimeStep } from './arrivals';

test('the first load never rings: everything already there is old news', () => {
  const first = arrivals(null, ['o1', 'o2']);
  expect(first.fresh).toBe(0);
  expect([...first.seen]).toEqual(['o1', 'o2']);
});

test('an id we have not seen before counts once', () => {
  const first = arrivals(null, ['o1']);
  const next = arrivals(first.seen, ['o1', 'o2']);
  expect(next.fresh).toBe(1);
  expect(arrivals(next.seen, ['o1', 'o2']).fresh).toBe(0);
});

test('an order that left the list and comes back does not ring again', () => {
  const a = arrivals(null, ['o1', 'o2']);
  const b = arrivals(a.seen, ['o2']);
  expect(arrivals(b.seen, ['o1', 'o2']).fresh).toBe(0);
});

describe('chimeStep', () => {
  const start = { orders: null, calls: null };

  test('first loads of orders and calls never ring', () => {
    const step = chimeStep(start, { orderIds: ['o1'], openCallIds: ['c1'], on: true });
    expect(step.ring).toBe(false);
  });

  test('a new order rings', () => {
    const first = chimeStep(start, { orderIds: ['o1'], openCallIds: [], on: true });
    expect(chimeStep(first.state, { orderIds: ['o1', 'o2'], openCallIds: [], on: true }).ring).toBe(
      true,
    );
  });

  test('a new open waiter call rings', () => {
    const first = chimeStep(start, { orderIds: ['o1'], openCallIds: [], on: true });
    expect(chimeStep(first.state, { orderIds: ['o1'], openCallIds: ['c1'], on: true }).ring).toBe(
      true,
    );
  });

  test('when calls are not heard (kitchen), they never ring and are never tracked', () => {
    const first = chimeStep(start, { orderIds: ['o1'], openCallIds: null, on: true });
    const next = chimeStep(first.state, { orderIds: ['o1'], openCallIds: null, on: true });
    expect(next.ring).toBe(false);
    expect(next.state.calls).toBeNull();
  });

  test('with the sound off nothing rings, but new ids are still remembered', () => {
    const first = chimeStep(start, { orderIds: ['o1'], openCallIds: [], on: true });
    const quiet = chimeStep(first.state, { orderIds: ['o1', 'o2'], openCallIds: [], on: false });
    expect(quiet.ring).toBe(false);
    // Turning the sound back on doesn't ring for o2 after the fact.
    expect(chimeStep(quiet.state, { orderIds: ['o1', 'o2'], openCallIds: [], on: true }).ring).toBe(
      false,
    );
  });

  test('data that has not loaded yet leaves that list alone', () => {
    const first = chimeStep(start, { orderIds: null, openCallIds: [], on: true });
    expect(first.state.orders).toBeNull();
    expect(chimeStep(first.state, { orderIds: ['o1'], openCallIds: [], on: true }).ring).toBe(
      false,
    );
  });
});
