import { formatCedis, formatMoney, parseMoneyInput, percentOf, sumPesewas } from './money';
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

test('formats money from the venue currency, with cedis kept as GH₵', () => {
  expect(formatMoney(pesewas(6500), 'GHS')).toBe('GH₵65');
  expect(formatMoney(pesewas(6550), 'GHS')).toBe('GH₵65.50');
  const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(1500);
  expect(formatMoney(pesewas(150000), 'NGN')).toBe(naira);
  expect(formatMoney(pesewas(5000), 'XOF')).toBe(new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(5000));
});

test('reads a price the owner typed back into pesewas', () => {
  expect(parseMoneyInput('65')).toBe(6500);
  expect(parseMoneyInput('65.50')).toBe(6550);
  expect(parseMoneyInput('GH₵2,480')).toBe(248000);
  expect(parseMoneyInput('65.5')).toBe(6550);
  expect(parseMoneyInput('')).toBeNull();
  expect(parseMoneyInput('12.345')).toBeNull();
});

test('rounds a tip half-up to the pesewa', () => {
  expect(percentOf(pesewas(100), 10)).toBe(10);
  expect(percentOf(pesewas(1), 50)).toBe(1);
  expect(percentOf(pesewas(333), 10)).toBe(33);
});
