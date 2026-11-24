import {
  asGuestSees,
  checkLine,
  dishStatus,
  isOnGuestMenu,
  isSoldOut,
  onSale,
  quantityLimits,
  statusFields,
  takeStock,
  unitPrice,
} from './dishRules';

const dish = { pricePesewas: 5000, available: true };
const NOW = Date.parse('2026-11-24T12:00:00.000Z');

describe('price', () => {
  test('without a sale the guest pays the normal price', () => {
    expect(unitPrice(dish)).toBe(5000);
    expect(onSale(dish)).toBe(false);
  });
  test('a sale price below the normal price is what the guest pays', () => {
    expect(unitPrice({ ...dish, salePricePesewas: 4000 })).toBe(4000);
    expect(onSale({ ...dish, salePricePesewas: 4000 })).toBe(true);
  });
  test('a "sale" that is not cheaper is ignored, so a typo never raises the price', () => {
    expect(unitPrice({ ...dish, salePricePesewas: 6000 })).toBe(5000);
    expect(unitPrice({ ...dish, salePricePesewas: 5000 })).toBe(5000);
    expect(unitPrice({ ...dish, salePricePesewas: null })).toBe(5000);
  });
});

describe('quantity', () => {
  test('missing limits mean 1 to 50', () => {
    expect(quantityLimits(dish)).toEqual({ min: 1, max: 50 });
  });
  test('the owner limits are used, and stock caps the top', () => {
    expect(quantityLimits({ ...dish, minQuantity: 2, maxQuantity: 6 })).toEqual({ min: 2, max: 6 });
    expect(quantityLimits({ ...dish, maxQuantity: 6, stockCount: 3 })).toEqual({ min: 1, max: 3 });
  });
  test('a line inside the limits is fine; outside them it is refused', () => {
    expect(checkLine({ ...dish, minQuantity: 2 }, 2, NOW)).toBe('ok');
    expect(checkLine({ ...dish, minQuantity: 2 }, 1, NOW)).toBe('out_of_range');
    expect(checkLine({ ...dish, maxQuantity: 4 }, 5, NOW)).toBe('out_of_range');
  });
  test('asking for more than is left, or anything when sold out or hidden, is sold out', () => {
    expect(checkLine({ ...dish, stockCount: 2 }, 3, NOW)).toBe('sold_out');
    expect(checkLine({ ...dish, available: false }, 1, NOW)).toBe('sold_out');
    expect(checkLine({ ...dish, hidden: true }, 1, NOW)).toBe('sold_out');
  });
});

describe('stock', () => {
  test('unlimited stock never changes', () => {
    expect(takeStock(dish, 3)).toEqual({});
  });
  test('an order takes its quantity away, and the last one sells the dish out', () => {
    expect(takeStock({ ...dish, stockCount: 5 }, 2)).toEqual({ stockCount: 3 });
    expect(takeStock({ ...dish, stockCount: 2 }, 2)).toEqual({ stockCount: 0, available: false });
  });
});

describe('status for the owner', () => {
  test('hidden beats sold out, which beats available', () => {
    expect(dishStatus(dish)).toBe('available');
    expect(dishStatus({ ...dish, available: false })).toBe('sold_out');
    expect(dishStatus({ ...dish, available: false, hidden: true })).toBe('hidden');
  });
  test('each status maps back to the fields we save', () => {
    expect(statusFields('available')).toEqual({ available: true, hidden: false });
    expect(statusFields('sold_out')).toEqual({ available: false, hidden: false });
    expect(statusFields('hidden')).toEqual({ available: true, hidden: true });
  });
  test('only hidden dishes are left off the guest menu; sold out ones still show', () => {
    expect(isOnGuestMenu({ ...dish, available: false })).toBe(true);
    expect(isOnGuestMenu({ ...dish, hidden: true })).toBe(false);
  });
});

describe('snooze', () => {
  const at = (iso: string) => ({ ...dish, snoozedUntil: iso });
  test('a snoozed dish is sold out until the time, then on sale again by itself', () => {
    expect(isSoldOut(at('2026-11-24T17:00:00.000Z'), NOW)).toBe(true);
    expect(checkLine(at('2026-11-24T17:00:00.000Z'), 1, NOW)).toBe('sold_out');
    expect(isSoldOut(at('2026-11-24T11:59:00.000Z'), NOW)).toBe(false);
    expect(checkLine(at('2026-11-24T11:59:00.000Z'), 1, NOW)).toBe('ok');
  });
  test('no snooze, or null, changes nothing; the sold-out switch still wins', () => {
    expect(isSoldOut(dish, NOW)).toBe(false);
    expect(isSoldOut({ ...dish, snoozedUntil: null }, NOW)).toBe(false);
    expect(isSoldOut({ ...dish, available: false }, NOW)).toBe(true);
  });
});

test('asGuestSees shows a snoozed dish as sold out and leaves the rest alone', () => {
  const snoozed = { ...dish, snoozedUntil: '2026-11-24T17:00:00.000Z' };
  const [a, b] = asGuestSees([snoozed, dish], NOW);
  expect(a!.available).toBe(false);
  expect(b).toBe(dish);
});
