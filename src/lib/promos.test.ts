import { bestPromo, promoState, type PromoRule } from './promos';

const tz = 'Africa/Accra';
// Thursday 12 November 2026, 17:00 in Accra (UTC+0).
const now = Date.parse('2026-11-12T17:00:00Z');
const rule = (over: Partial<PromoRule>): PromoRule => ({
  id: 'p1',
  name: 'Happy hour',
  kind: 'percent_off',
  percent: 20,
  channel: 'all',
  enabled: true,
  days: [],
  startTime: null,
  endTime: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  usageCount: 0,
  code: null,
  minSpendPesewas: null,
  appliesTo: 'order',
  ...over,
});
const lines = [
  {
    menuItemId: 'jollof',
    categoryId: 'mains',
    totalPesewas: 6000,
    quantity: 1,
    unitPricePesewas: 6000,
  },
  {
    menuItemId: 'sobolo',
    categoryId: 'drinks',
    totalPesewas: 3000,
    quantity: 2,
    unitPricePesewas: 1500,
  },
];
const order = { lines, channel: 'table' as const, code: null };

test('state: off, scheduled, running and ended', () => {
  expect(promoState(rule({ enabled: false }), now)).toBe('off');
  expect(promoState(rule({ startsAt: '2026-11-14T00:00:00Z' }), now)).toBe('scheduled');
  expect(promoState(rule({ endsAt: '2026-11-01T00:00:00Z' }), now)).toBe('ended');
  expect(promoState(rule({ usageLimit: 5, usageCount: 5 }), now)).toBe('ended');
  expect(promoState(rule({}), now)).toBe('running');
});

test('percent off the whole order, rounded down to the pesewa', () => {
  expect(bestPromo([rule({ percent: 15 })], order, now, tz)).toEqual({
    promoId: 'p1',
    name: 'Happy hour',
    pesewas: 1350,
  });
});

test('days and the daily window use the venue clock', () => {
  // Thursday is day 3 (Monday is 0).
  expect(bestPromo([rule({ days: [0, 1] })], order, now, tz)).toBeNull();
  expect(bestPromo([rule({ days: [3] })], order, now, tz)?.pesewas).toBe(1800);
  expect(
    bestPromo([rule({ startTime: '16:00', endTime: '18:00' })], order, now, tz),
  ).not.toBeNull();
  expect(bestPromo([rule({ startTime: '18:00', endTime: '20:00' })], order, now, tz)).toBeNull();
});

test('channel, minimum spend and code all have to match', () => {
  expect(bestPromo([rule({ channel: 'online' })], order, now, tz)).toBeNull();
  expect(bestPromo([rule({ minSpendPesewas: 10000 })], order, now, tz)).toBeNull();
  expect(bestPromo([rule({ code: 'FRIDAY10' })], order, now, tz)).toBeNull();
  expect(
    bestPromo([rule({ code: 'FRIDAY10' })], { ...order, code: 'FRIDAY10' }, now, tz),
  ).not.toBeNull();
});

test('a section promo only discounts that section; a free item takes one off', () => {
  expect(
    bestPromo([rule({ appliesTo: 'category', categoryId: 'drinks', percent: 50 })], order, now, tz)
      ?.pesewas,
  ).toBe(1500);
  expect(
    bestPromo([rule({ kind: 'free_item', percent: null, freeItemId: 'sobolo' })], order, now, tz)
      ?.pesewas,
  ).toBe(1500);
  expect(
    bestPromo([rule({ kind: 'free_item', percent: null, freeItemId: 'kelewele' })], order, now, tz),
  ).toBeNull();
});

test('amount off never goes below zero, and the biggest single promo wins', () => {
  expect(
    bestPromo([rule({ kind: 'amount_off', percent: null, amountPesewas: 50000 })], order, now, tz)
      ?.pesewas,
  ).toBe(9000);
  const best = bestPromo(
    [
      rule({ id: 'a', percent: 10 }),
      rule({ id: 'b', kind: 'amount_off', percent: null, amountPesewas: 2000 }),
    ],
    order,
    now,
    tz,
  );
  expect(best?.promoId).toBe('b');
});

test('a typed code that matches no running promo is an error, not a silent no-op', () => {
  expect(() => bestPromo([rule({})], { ...order, code: 'NOPE' }, now, tz)).toThrow(
    'promo_not_valid',
  );
});
