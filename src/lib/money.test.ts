import { formatMoney, percentOf, sumPesewas } from './money';
import { pesewas } from './brand';

test('formats the Ghana sample without decimals when the pesewas are zero', () => {
  expect(formatMoney(pesewas(6500))).toBe('GH₵65');
  expect(formatMoney(pesewas(248000))).toBe('GH₵2,480');
});

test('keeps pesewas when they are not zero', () => {
  expect(formatMoney(pesewas(6550))).toBe('GH₵65.50');
  expect(formatMoney(pesewas(5))).toBe('GH₵0.05');
});

test('uses the currency symbol instead of cedis', () => {
  expect(formatMoney(pesewas(6500), 'NGN')).toBe('₦65');
  expect(formatMoney(pesewas(6500), 'USD')).toBe('$65');
  expect(formatMoney(pesewas(6550), 'EUR', 'fr-FR')).toBe('65,50\u00a0€');
  expect(formatMoney(pesewas(6500), 'NGN')).not.toMatch(/GH|₵/);
});

test('sums pesewas as integers', () => {
  expect(sumPesewas([pesewas(6500), pesewas(1500), pesewas(1500)])).toBe(9500);
});

test('rounds a tip half-up to the minor unit', () => {
  expect(percentOf(pesewas(100), 10)).toBe(10);
  expect(percentOf(pesewas(1), 50)).toBe(1);
  expect(percentOf(pesewas(333), 10)).toBe(33);
});
