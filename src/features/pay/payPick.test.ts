import { payMethodsFor, placeOrderPlan } from './payPick';

describe('payMethodsFor', () => {
  test('a table with cash on: MoMo, Cash and Card', () => {
    expect(payMethodsFor({ table: true, delivery: false, cash: true })).toEqual([
      'momo',
      'cash',
      'card',
    ]);
  });
  test('delivery with cash on: cash is paid on delivery', () => {
    expect(payMethodsFor({ table: false, delivery: true, cash: true })).toEqual([
      'momo',
      'cash',
      'card',
    ]);
  });
  test('pickup is paid in the app, so no cash (Clarke, 2026-11-16)', () => {
    expect(payMethodsFor({ table: false, delivery: false, cash: true })).toEqual(['momo', 'card']);
  });
  test('a venue that takes no cash never offers it', () => {
    expect(payMethodsFor({ table: true, delivery: false, cash: false })).toEqual(['momo', 'card']);
  });
});

describe('placeOrderPlan', () => {
  test('MoMo and card go to the payment page', () => {
    expect(placeOrderPlan('momo', { table: true })).toBe('checkout');
    expect(placeOrderPlan('card', { table: false })).toBe('checkout');
  });
  test('cash at a table asks the waiter for the bill', () => {
    expect(placeOrderPlan('cash', { table: true })).toBe('bill');
  });
  test('cash on delivery just sends the order', () => {
    expect(placeOrderPlan('cash', { table: false })).toBe('send');
  });
});
