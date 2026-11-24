import { bulkPrices, changePrice } from './bulkPrices';

describe('changePrice', () => {
  test('up or down by the percent, to the nearest step', () => {
    expect(changePrice(5000, 10, 50)).toBe(5500);
    expect(changePrice(4550, 10, 50)).toBe(5000); // 5005 → nearest GH₵0.50
    expect(changePrice(5000, -10, 100)).toBe(4500);
    expect(changePrice(1234, 5, 1)).toBe(1296); // 1295.7 → nearest pesewa
  });
  test('never below one step, so a dish never becomes free by accident', () => {
    expect(changePrice(100, -50, 100)).toBe(100);
  });
});

describe('bulkPrices', () => {
  const dish = (id: string, pricePesewas: number, salePricePesewas: number | null = null) => ({
    id,
    pricePesewas,
    salePricePesewas,
  });

  test('changes each price and keeps a sale a sale', () => {
    expect(bulkPrices([dish('a', 5000, 4000)], 10, 50)).toEqual([
      { id: 'a', pricePesewas: 5500, salePricePesewas: 4400 },
    ]);
  });

  test('a sale that would no longer be cheaper is dropped', () => {
    // 1000 + 10% = 1100; 990 + 10% = 1089, to the nearest 1.00 = 1100: not a sale any more.
    expect(bulkPrices([dish('a', 1000, 990)], 10, 100)).toEqual([
      { id: 'a', pricePesewas: 1100, salePricePesewas: null },
    ]);
  });

  test('dishes whose price would not change are left out', () => {
    expect(bulkPrices([dish('a', 5000), dish('b', 5010)], 0, 1)).toEqual([]);
    expect(bulkPrices([dish('a', 5000)], 0.1, 50)).toEqual([]);
  });
});
