import { EMPTY_DRAFT, toInput } from './promoForm';

test('a percent promo needs a name and 1 to 100', () => {
  expect(toInput({ ...EMPTY_DRAFT, name: 'H' })).toEqual({ ok: false, field: 'name' });
  expect(toInput({ ...EMPTY_DRAFT, name: 'Happy hour', percent: '0' })).toEqual({
    ok: false,
    field: 'percent',
  });
  const ok = toInput({
    ...EMPTY_DRAFT,
    name: 'Happy hour',
    percent: '20',
    days: [4, 0],
    startTime: '16:00',
    endTime: '18:00',
  });
  expect(ok).toMatchObject({
    ok: true,
    input: { percent: 20, days: [0, 4], startTime: '16:00', code: null },
  });
});

test('codes go upper case; half-filled hours and bad money are refused', () => {
  expect(toInput({ ...EMPTY_DRAFT, name: 'Code', percent: '10', code: 'friday10' })).toMatchObject({
    ok: true,
    input: { code: 'FRIDAY10' },
  });
  expect(toInput({ ...EMPTY_DRAFT, name: 'Late', percent: '10', startTime: '16:00' })).toEqual({
    ok: false,
    field: 'startTime',
  });
  expect(toInput({ ...EMPTY_DRAFT, name: 'Off', kind: 'amount_off', amount: 'abc' })).toEqual({
    ok: false,
    field: 'amount',
  });
  expect(toInput({ ...EMPTY_DRAFT, name: 'Off', kind: 'amount_off', amount: '15' })).toMatchObject({
    ok: true,
    input: { amountPesewas: 1500, percent: null },
  });
});
