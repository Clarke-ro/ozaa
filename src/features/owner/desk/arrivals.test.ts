import { arrivals } from './arrivals';

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
