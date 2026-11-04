import { checkOrdering, orderingDraftOf } from './orderingForm';

const draft = {
  enabled: true,
  pickupOn: true,
  prepMinutes: '20',
  deliveryOn: true,
  minimumFee: '10',
  perKm: '2.50',
  maxKm: '8',
  freeOver: '200',
};

test('a full form becomes the settings to save, in pesewas', () => {
  expect(checkOrdering(draft)).toEqual({
    ok: true,
    settings: {
      enabled: true,
      pickup: { enabled: true, prepMinutes: 20 },
      delivery: {
        enabled: true,
        minimumFeePesewas: 1000,
        feePerKmPesewas: 250,
        maxDistanceKm: 8,
        freeOverPesewas: 20000,
      },
    },
  });
});

test('an empty free-delivery amount means never free', () => {
  const check = checkOrdering({ ...draft, freeOver: '' });
  expect(check.ok && check.settings.delivery.freeOverPesewas).toBeNull();
});

test('switched on, online ordering needs pickup or delivery', () => {
  expect(checkOrdering({ ...draft, pickupOn: false, deliveryOn: false })).toEqual({
    ok: false,
    field: 'method',
  });
});

test('bad numbers are refused, field by field', () => {
  expect(checkOrdering({ ...draft, prepMinutes: 'soon' })).toEqual({ ok: false, field: 'prep' });
  expect(checkOrdering({ ...draft, prepMinutes: '300' })).toEqual({ ok: false, field: 'prep' });
  expect(checkOrdering({ ...draft, minimumFee: 'x' })).toEqual({ ok: false, field: 'minimumFee' });
  expect(checkOrdering({ ...draft, perKm: '-1' })).toEqual({ ok: false, field: 'perKm' });
  expect(checkOrdering({ ...draft, maxKm: '0' })).toEqual({ ok: false, field: 'maxKm' });
  expect(checkOrdering({ ...draft, maxKm: '60' })).toEqual({ ok: false, field: 'maxKm' });
  expect(checkOrdering({ ...draft, freeOver: 'lots' })).toEqual({ ok: false, field: 'freeOver' });
});

test('delivery fields are not checked while delivery is off', () => {
  const check = checkOrdering({ ...draft, deliveryOn: false, perKm: 'x', maxKm: '' });
  expect(check.ok).toBe(true);
});

test('the form fills from saved settings, or sensible blanks', () => {
  expect(orderingDraftOf(undefined)).toMatchObject({
    enabled: false,
    prepMinutes: '20',
    freeOver: '',
  });
  const back = checkOrdering(draft);
  expect(back.ok && orderingDraftOf(back.settings)).toEqual({
    ...draft,
    minimumFee: '10.00',
    perKm: '2.50',
    freeOver: '200.00',
  });
});
