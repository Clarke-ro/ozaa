import { formatCedis, percentOf, sumPesewas } from './money';
import { pesewas } from './brand';

test('formats whole cedis without decimals', () => {
  expect(formatCedis(pesewas(6500))).toBe('GH₵65');
  expect(formatCedis(pesewas(248000))).toBe('GH₵2,480');
});

test('keeps pesewas when they are not zero', () => {
  expect(formatCedis(pesewas(6550))).toBe('GH₵65.50');
  expect(formatCedis(pesewas(5))).toBe('GH₵0.05');
});

test('sums pesewas as integers', () => {
  expect(sumPesewas([pesewas(6500), pesewas(1500), pesewas(1500)])).toBe(9500);
});

test('rounds a tip half-up to the pesewa', () => {
  expect(percentOf(pesewas(100), 10)).toBe(10);
  expect(percentOf(pesewas(1), 50)).toBe(1);
  expect(percentOf(pesewas(333), 10)).toBe(33);
});
