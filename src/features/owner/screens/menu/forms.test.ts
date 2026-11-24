// Imported directly: the menu feature index pulls in storage that Jest does not load.
import { isCategoryAvailable } from '@/lib/menuSchedule';
import { checkDish, checkSection, checkStock, dayNumber, WEEK } from './forms';

describe('days', () => {
  test('Monday to Saturday are 1-6 and Sunday is 0, like Date.getUTCDay and the guest menu', () => {
    expect(WEEK.map(dayNumber)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  test('a section open every day is open on a Sunday', () => {
    const everyDay = checkSection({
      name: 'Mains',
      scheduled: true,
      days: WEEK.map(dayNumber),
      start: '00:00',
      end: '23:59',
    });
    expect(everyDay.ok).toBe(true);
    const sunday = new Date('2026-11-01T12:00:00Z');
    expect(sunday.getUTCDay()).toBe(0);
    if (everyDay.ok) expect(isCategoryAvailable(everyDay.schedule, sunday)).toBe(true);
  });
});

describe('checkSection', () => {
  const base = { name: 'Lunch', scheduled: true, days: [1], start: '12:00', end: '15:00' };
  test('needs a name, a day, real times and an end after the start', () => {
    expect(checkSection({ ...base, name: ' ' })).toEqual({ ok: false, field: 'name' });
    expect(checkSection({ ...base, days: [] })).toEqual({ ok: false, field: 'days' });
    expect(checkSection({ ...base, start: '25:00' })).toEqual({ ok: false, field: 'start' });
    expect(checkSection({ ...base, end: '11:00' })).toEqual({ ok: false, field: 'end' });
  });
  test('times are padded to HH:mm, and no schedule means none is sent', () => {
    expect(checkSection({ ...base, start: '9:5', end: '9:30' })).toEqual({
      ok: false,
      field: 'start',
    });
    expect(checkSection({ ...base, start: '9:00' })).toMatchObject({
      ok: true,
      schedule: { startTime: '09:00' },
    });
    expect(checkSection({ ...base, scheduled: false })).toEqual({
      ok: true,
      name: 'Lunch',
      schedule: undefined,
    });
  });
});

describe('checkDish', () => {
  const base = { name: 'Jollof', price: '65', categoryId: 'c1', groups: [] };
  test('price must be a positive amount in cedis, saved as pesewas', () => {
    expect(checkDish(base)).toMatchObject({ ok: true, pricePesewas: 6500 });
    expect(checkDish({ ...base, price: '0' })).toEqual({ ok: false, field: 'price' });
    expect(checkDish({ ...base, price: 'abc' })).toEqual({ ok: false, field: 'price' });
  });
  test('needs a name and a section', () => {
    expect(checkDish({ ...base, name: '' })).toEqual({ ok: false, field: 'name' });
    expect(checkDish({ ...base, categoryId: '' })).toEqual({ ok: false, field: 'section' });
  });
  test('add-on groups need a name, named options, and sensible min and max', () => {
    const option = { id: 'o', name: { en: 'Extra egg' }, pricePesewas: 300 };
    const group = { id: 'g', name: { en: 'Extras' }, min: 0, max: 1, options: [option] };
    expect(checkDish({ ...base, groups: [group] }).ok).toBe(true);
    expect(checkDish({ ...base, groups: [{ ...group, name: { en: '' } }] })).toEqual({
      ok: false,
      field: 'addOns',
    });
    expect(checkDish({ ...base, groups: [{ ...group, options: [] }] })).toEqual({
      ok: false,
      field: 'addOns',
    });
    expect(checkDish({ ...base, groups: [{ ...group, min: 2, max: 1 }] })).toEqual({
      ok: false,
      field: 'addOns',
    });
    expect(checkDish({ ...base, groups: [{ ...group, min: 2, max: 2 }] })).toEqual({
      ok: false,
      field: 'addOns',
    });
  });
});

describe('checkStock', () => {
  const blank = { pricePesewas: 5000, salePrice: '', stock: '', minQuantity: '', maxQuantity: '' };

  test('all blank means no sale, unlimited stock and the default limits', () => {
    expect(checkStock(blank)).toEqual({
      ok: true,
      salePricePesewas: null,
      stockCount: null,
      minQuantity: 1,
      maxQuantity: 50,
    });
  });

  test('a sale price must be above 0 and below the normal price', () => {
    expect(checkStock({ ...blank, salePrice: '40' })).toMatchObject({
      ok: true,
      salePricePesewas: 4000,
    });
    expect(checkStock({ ...blank, salePrice: '50' })).toEqual({ ok: false, field: 'salePrice' });
    expect(checkStock({ ...blank, salePrice: '0' })).toEqual({ ok: false, field: 'salePrice' });
    expect(checkStock({ ...blank, salePrice: 'abc' })).toEqual({ ok: false, field: 'salePrice' });
  });

  test('stock is a whole number from 0 up; 0 is allowed and means sold out', () => {
    expect(checkStock({ ...blank, stock: '0' })).toMatchObject({ ok: true, stockCount: 0 });
    expect(checkStock({ ...blank, stock: ' 12 ' })).toMatchObject({ ok: true, stockCount: 12 });
    expect(checkStock({ ...blank, stock: '2.5' })).toEqual({ ok: false, field: 'stock' });
    expect(checkStock({ ...blank, stock: '-1' })).toEqual({ ok: false, field: 'stock' });
  });

  test('min and max are 1 to 50, and min cannot be above max', () => {
    expect(checkStock({ ...blank, minQuantity: '2', maxQuantity: '6' })).toMatchObject({
      ok: true,
      minQuantity: 2,
      maxQuantity: 6,
    });
    expect(checkStock({ ...blank, minQuantity: '0' })).toEqual({ ok: false, field: 'quantity' });
    expect(checkStock({ ...blank, maxQuantity: '51' })).toEqual({ ok: false, field: 'quantity' });
    expect(checkStock({ ...blank, minQuantity: '5', maxQuantity: '3' })).toEqual({
      ok: false,
      field: 'quantity',
    });
  });
});
