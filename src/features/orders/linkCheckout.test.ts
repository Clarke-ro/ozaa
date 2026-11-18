import { checkCheckout, type CheckoutDraft } from './linkCheckout';

const settings = {
  enabled: true,
  pickup: { enabled: true, prepMinutes: 20 },
  delivery: {
    enabled: true,
    minimumFeePesewas: 1000,
    feePerKmPesewas: 250,
    maxDistanceKm: 5,
    freeOverPesewas: null,
  },
};
const pin = { lat: 5.556, lng: -0.1822 };
const draft: CheckoutDraft = {
  type: 'pickup',
  name: 'Esi',
  phone: '024 123 4567',
  address: '',
  location: null,
};

test('a pickup with a name and a Ghana phone is ready, with the phone in +233 form', () => {
  expect(checkCheckout(draft, settings, pin, 5000)).toEqual({
    ok: true,
    fulfilment: { type: 'pickup', contact: { name: 'Esi', phone: '+233241234567' } },
    deliveryFeePesewas: 0,
    etaMinutes: 20,
  });
});

test('name and phone are checked first, each with its own message', () => {
  expect(checkCheckout({ ...draft, name: ' ' }, settings, pin, 5000)).toEqual({
    ok: false,
    field: 'name',
  });
  expect(checkCheckout({ ...draft, phone: '12' }, settings, pin, 5000)).toEqual({
    ok: false,
    field: 'phone',
  });
});

test('delivery needs the address and the location, then shows the fee', () => {
  const delivery: CheckoutDraft = { ...draft, type: 'delivery' };
  expect(checkCheckout(delivery, settings, pin, 5000)).toEqual({ ok: false, field: 'address' });
  expect(checkCheckout({ ...delivery, address: 'House 4' }, settings, pin, 5000)).toEqual({
    ok: false,
    field: 'location',
  });
  const ready = checkCheckout(
    { ...delivery, address: 'House 4', location: { lat: 5.576, lng: -0.1822 } },
    settings,
    pin,
    5000,
  );
  // 5 km zone × 250 pesewas, not the minimum a pin next door would have paid.
  expect(ready.ok && ready.deliveryFeePesewas).toBe(1250);
});

test('too far is its own message, so the customer can switch to pickup', () => {
  const far: CheckoutDraft = {
    ...draft,
    type: 'delivery',
    address: 'Far',
    location: { lat: 5.8, lng: -0.1822 },
  };
  expect(checkCheckout(far, settings, pin, 5000)).toEqual({ ok: false, field: 'too_far' });
});
