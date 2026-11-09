import { pesewas } from '@/lib/brand';
import { quoteBill, type Bill, type BillLine } from './quoteBill';

const lines: BillLine[] = [
  { id: 'a', totalPesewas: pesewas(70), paid: false },
  { id: 'b', totalPesewas: pesewas(30), paid: false },
];

/** A bill as the order reports it: total (dishes plus any delivery fee) and what's paid so far. */
function bill(over: Partial<Bill> = {}): Bill {
  return { lines, totalPesewas: pesewas(100), paidPesewas: pesewas(0), ...over };
}

test('the whole bill is the unpaid total plus a half-up tip', () => {
  const quote = quoteBill(bill(), { mode: 'whole', tip: { percent: 10 } });
  expect(quote.sharePesewas).toBe(100);
  expect(quote.tipPesewas).toBe(10);
  expect(quote.totalPesewas).toBe(110);
  expect(quote.remainingAfterPesewas).toBe(0);
});

test('equal split gives the leftover pesewa to the first payer', () => {
  const one = [{ id: 'a', totalPesewas: pesewas(100), paid: false }];
  const first = quoteBill(bill({ lines: one }), { mode: 'equal', parts: 3 });
  expect(first.sharePesewas).toBe(34);
  expect(first.remainingAfterPesewas).toBe(66);
  // The first payer's 34 is on the order now; the other two share what is left.
  const second = quoteBill(bill({ lines: one, paidPesewas: pesewas(34) }), {
    mode: 'equal',
    parts: 2,
  });
  expect(second.sharePesewas).toBe(33);
  expect(second.remainingAfterPesewas).toBe(33);
});

test('after an equal share is paid, the whole bill is only what is left', () => {
  const quote = quoteBill(bill({ paidPesewas: pesewas(50) }), { mode: 'whole' });
  expect(quote.sharePesewas).toBe(50);
  expect(quote.remainingAfterPesewas).toBe(0);
});

test('the whole bill includes the delivery fee', () => {
  const quote = quoteBill(bill({ totalPesewas: pesewas(115) }), { mode: 'whole' });
  expect(quote.sharePesewas).toBe(115);
  expect(quote.remainingAfterPesewas).toBe(0);
});

test('my items adds only the chosen unpaid lines', () => {
  const quote = quoteBill(
    bill({
      lines: [...lines, { id: 'c', totalPesewas: pesewas(15), paid: true }],
      totalPesewas: pesewas(115),
      paidPesewas: pesewas(15),
    }),
    { mode: 'items', lineIds: ['b'], tip: { customPesewas: pesewas(5) } },
  );
  expect(quote.sharePesewas).toBe(30);
  expect(quote.tipPesewas).toBe(5);
  expect(quote.remainingAfterPesewas).toBe(70);
});

test('a dish picked twice is paid for once', () => {
  const quote = quoteBill(bill(), { mode: 'items', lineIds: ['b', 'b'] });
  expect(quote.sharePesewas).toBe(30);
});

test('my items never asks for more than is left on the bill', () => {
  const quote = quoteBill(bill({ paidPesewas: pesewas(50) }), { mode: 'items', lineIds: ['a'] });
  expect(quote.sharePesewas).toBe(50);
  expect(quote.remainingAfterPesewas).toBe(0);
});

test('a paid line cannot be selected again', () => {
  expect(() => quoteBill(bill(), { mode: 'items', lineIds: ['missing'] })).toThrow(
    'line_unavailable',
  );
});
