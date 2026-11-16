import { receiptFigures } from './receiptFigures';

const order = {
  subtotalPesewas: 13_000,
  taxes: [] as { code: 'vat' | 'nhil' | 'getfund'; label: string; amountPesewas: number }[],
  totalPesewas: 13_000,
  paidPesewas: 13_000,
};
const payment = { amountPesewas: 14_300, tipPesewas: 1_300 };

test('a whole bill with a tip: share is what was paid less the tip, nothing left', () => {
  expect(receiptFigures(order, payment)).toEqual({
    subtotal: 13_000,
    taxes: [],
    tableTotal: 13_000,
    share: 13_000,
    tip: 1_300,
    fee: 0,
    paid: 14_300,
    stillToPay: 0,
  });
});

test('a fee the guest paid is its own line, and never counts as their share of the bill', () => {
  const figures = receiptFigures(order, {
    amountPesewas: 14_580,
    tipPesewas: 1_300,
    feePesewas: 280,
  });
  expect(figures.fee).toBe(280);
  expect(figures.share).toBe(13_000);
  expect(figures.paid).toBe(14_580);
});

test('a split bill: what is still to pay at the table comes from the order', () => {
  const figures = receiptFigures(
    { ...order, paidPesewas: 6_500 },
    { amountPesewas: 6_500, tipPesewas: 0 },
  );
  expect(figures.share).toBe(6_500);
  expect(figures.stillToPay).toBe(6_500);
});

test('tax lines pass through in order, ready for when E-VAT is on', () => {
  const taxes = [
    { code: 'vat' as const, label: 'VAT 15%', amountPesewas: 1_950 },
    { code: 'nhil' as const, label: 'NHIL 2.5%', amountPesewas: 325 },
  ];
  const figures = receiptFigures(
    { ...order, taxes, totalPesewas: 15_275, paidPesewas: 15_275 },
    {
      amountPesewas: 15_275,
    },
  );
  expect(figures.taxes).toEqual(taxes);
  expect(figures.tableTotal).toBe(15_275);
});

test('no tip on the payment counts as zero, and overpaid never shows a negative balance', () => {
  const figures = receiptFigures({ ...order, paidPesewas: 14_000 }, { amountPesewas: 13_000 });
  expect(figures.tip).toBe(0);
  expect(figures.share).toBe(13_000);
  expect(figures.stillToPay).toBe(0);
});
