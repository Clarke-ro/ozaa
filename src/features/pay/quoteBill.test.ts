import { pesewas } from '@/lib/brand';
import { quoteBill, type BillLine } from './quoteBill';

const lines: BillLine[] = [
  { id: 'a', totalPesewas: pesewas(70), paid: false },
  { id: 'b', totalPesewas: pesewas(30), paid: false },
];

test('the whole bill is the unpaid total plus a half-up tip', () => {
  const quote = quoteBill(lines, { mode: 'whole', tip: { percent: 10 } });
  expect(quote.sharePesewas).toBe(100);
  expect(quote.tipPesewas).toBe(10);
  expect(quote.totalPesewas).toBe(110);
  expect(quote.remainingAfterPesewas).toBe(0);
});

test('equal split gives the leftover pesewa to the first payer', () => {
  const first = quoteBill([{ id: 'a', totalPesewas: pesewas(100), paid: false }], {
    mode: 'equal',
    parts: 3,
  });
  expect(first.sharePesewas).toBe(34);
  expect(first.remainingAfterPesewas).toBe(66);
  const second = quoteBill([{ id: 'a', totalPesewas: pesewas(66), paid: false }], {
    mode: 'equal',
    parts: 2,
  });
  expect(second.sharePesewas).toBe(33);
  expect(second.remainingAfterPesewas).toBe(33);
});

test('my items adds only the chosen unpaid lines', () => {
  const quote = quoteBill([...lines, { id: 'c', totalPesewas: pesewas(15), paid: true }], {
    mode: 'items',
    lineIds: ['b'],
    tip: { customPesewas: pesewas(5) },
  });
  expect(quote.sharePesewas).toBe(30);
  expect(quote.tipPesewas).toBe(5);
  expect(quote.remainingAfterPesewas).toBe(70);
});

test('a paid line cannot be selected again', () => {
  expect(() => quoteBill(lines, { mode: 'items', lineIds: ['missing'] })).toThrow(
    'line_unavailable',
  );
});
