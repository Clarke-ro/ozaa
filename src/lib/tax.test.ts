import { taxLines } from './tax';

test('off means no tax lines', () => {
  expect(taxLines(12000, null)).toEqual({ lines: [], addedPesewas: 0 });
  expect(taxLines(12000, { enabled: false, pricesIncludeTax: true })).toEqual({
    lines: [],
    addedPesewas: 0,
  });
});

test('prices include tax: the lines are taken out of the price, nothing is added', () => {
  // 12,000 includes 20% in levies and VAT, so the base is 10,000.
  const result = taxLines(12000, { enabled: true, pricesIncludeTax: true });
  expect(result.addedPesewas).toBe(0);
  expect(result.lines.map((line) => [line.code, line.amountPesewas])).toEqual([
    ['vat', 1500],
    ['nhil', 250],
    ['getfund', 250],
  ]);
});

test('prices exclude tax: the lines go on top', () => {
  const result = taxLines(10000, { enabled: true, pricesIncludeTax: false });
  expect(result.addedPesewas).toBe(2000);
  expect(result.lines.reduce((sum, line) => sum + line.amountPesewas, 0)).toBe(2000);
});
