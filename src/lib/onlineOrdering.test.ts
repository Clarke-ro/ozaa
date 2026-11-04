import { deliveryQuote, onlineOrderingOf } from './onlineOrdering';

const delivery = {
  enabled: true,
  minimumFeePesewas: 1000,
  feePerKmPesewas: 250,
  maxDistanceKm: 8,
  freeOverPesewas: 20000,
};
const settings = { enabled: true, pickup: { enabled: true, prepMinutes: 20 }, delivery };

test('missing settings mean online ordering is off, with safe defaults', () => {
  const off = onlineOrderingOf(undefined);
  expect(off.enabled).toBe(false);
  expect(off.pickup.enabled).toBe(false);
  expect(off.delivery.enabled).toBe(false);
});

test('the fee is the per-km price, but never below the minimum', () => {
  // 2 km × 250 = 500, below the 1000 minimum.
  expect(deliveryQuote(settings, 2, 5000)).toEqual({ ok: true, feePesewas: 1000 });
  // 6 km × 250 = 1500.
  expect(deliveryQuote(settings, 6, 5000)).toEqual({ ok: true, feePesewas: 1500 });
});

test('part kilometres round to the nearest pesewa', () => {
  // 5.3 km × 250 = 1325.
  expect(deliveryQuote(settings, 5.3, 5000)).toEqual({ ok: true, feePesewas: 1325 });
  // 4.33 km × 250 = 1082.5 → 1083 (half up).
  expect(deliveryQuote(settings, 4.33, 5000)).toEqual({ ok: true, feePesewas: 1083 });
});

test('delivery is free from the threshold, and only from it', () => {
  expect(deliveryQuote(settings, 6, 20000)).toEqual({ ok: true, feePesewas: 0 });
  expect(deliveryQuote(settings, 6, 19999)).toEqual({ ok: true, feePesewas: 1500 });
  const never = { ...settings, delivery: { ...delivery, freeOverPesewas: null } };
  expect(deliveryQuote(never, 6, 999999)).toEqual({ ok: true, feePesewas: 1500 });
});

test('too far, delivery off or ordering off are refused with the reason', () => {
  expect(deliveryQuote(settings, 8, 5000).ok).toBe(true);
  expect(deliveryQuote(settings, 8.01, 5000)).toEqual({ ok: false, reason: 'too_far' });
  expect(
    deliveryQuote({ ...settings, delivery: { ...delivery, enabled: false } }, 1, 5000),
  ).toEqual({
    ok: false,
    reason: 'off',
  });
  expect(deliveryQuote({ ...settings, enabled: false }, 1, 5000)).toEqual({
    ok: false,
    reason: 'off',
  });
});

test('a distance that is not a real number is refused, never charged', () => {
  expect(deliveryQuote(settings, Number.NaN, 5000)).toEqual({ ok: false, reason: 'bad_distance' });
  expect(deliveryQuote(settings, -1, 5000)).toEqual({ ok: false, reason: 'bad_distance' });
});
