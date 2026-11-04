import { checkFulfilment, deliveryQuote, onlineOrderingOf } from './onlineOrdering';

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

describe('checkFulfilment', () => {
  const venuePin = { lat: 5.556, lng: -0.1822 };
  const contact = { name: 'Esi', phone: '+233241234567' };
  // About 2.2 km north of the venue.
  const near = { lat: 5.576, lng: -0.1822 };
  const far = { lat: 5.7, lng: -0.1822 };

  test('pickup needs ordering and pickup on, and gives the prep time', () => {
    expect(checkFulfilment(settings, null, { type: 'pickup', contact }, 5000)).toEqual({
      ok: true,
      source: 'pickup',
      deliveryFeePesewas: 0,
      etaMinutes: 20,
    });
    const noPickup = { ...settings, pickup: { enabled: false, prepMinutes: 20 } };
    expect(checkFulfilment(noPickup, null, { type: 'pickup', contact }, 5000)).toEqual({
      ok: false,
      code: 'method_off',
    });
  });

  test('delivery adds the fee for the distance from the venue pin', () => {
    const check = checkFulfilment(
      settings,
      venuePin,
      { type: 'delivery', contact, address: 'House 4, Oxford St', location: near },
      5000,
    );
    // 2.2 km × 250 = 556, below the 1000 minimum.
    expect(check).toEqual({
      ok: true,
      source: 'delivery',
      deliveryFeePesewas: 1000,
      etaMinutes: 20,
    });
  });

  test('delivery is refused without the venue pin, the address or the location, or when too far', () => {
    const order = { type: 'delivery' as const, contact, address: 'House 4', location: near };
    expect(checkFulfilment(settings, null, order, 5000)).toEqual({
      ok: false,
      code: 'no_venue_location',
    });
    expect(checkFulfilment(settings, venuePin, { ...order, address: ' ' }, 5000)).toEqual({
      ok: false,
      code: 'missing_address',
    });
    expect(checkFulfilment(settings, venuePin, { ...order, location: undefined }, 5000)).toEqual({
      ok: false,
      code: 'missing_location',
    });
    expect(checkFulfilment(settings, venuePin, { ...order, location: far }, 5000)).toEqual({
      ok: false,
      code: 'too_far',
    });
  });

  test('with online ordering off, nothing can be ordered from the link', () => {
    expect(
      checkFulfilment({ ...settings, enabled: false }, null, { type: 'pickup', contact }, 5000),
    ).toEqual({
      ok: false,
      code: 'online_ordering_off',
    });
  });

  test('a contact needs a name and a phone', () => {
    expect(
      checkFulfilment(
        settings,
        null,
        { type: 'pickup', contact: { name: ' ', phone: '+233241234567' } },
        5000,
      ),
    ).toEqual({ ok: false, code: 'missing_contact' });
  });
});
