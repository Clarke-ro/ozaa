import type { Order, Payment } from '@/lib/api/types';

export type ReceiptFigures = {
  subtotal: number;
  /** Empty until E-VAT is switched on; then VAT, NHIL and GETFund, each on its own line. */
  taxes: Order['taxes'];
  tableTotal: number;
  /** The guest's part of the bill: what they paid, less the tip and the fee. */
  share: number;
  tip: number;
  /** The part of Paystack's fee the venue passed on. Its own line; never pays for food. */
  fee: number;
  paid: number;
  /** What the table still owes after every payment so far. Never below zero. */
  stillToPay: number;
};

/** The money on a receipt, all in pesewas and all from the server's own figures. */
export function receiptFigures(
  order: Pick<Order, 'subtotalPesewas' | 'taxes' | 'totalPesewas' | 'paidPesewas'>,
  payment: Pick<Payment, 'amountPesewas' | 'tipPesewas' | 'feePesewas'>,
): ReceiptFigures {
  const tip = payment.tipPesewas ?? 0;
  const fee = payment.feePesewas ?? 0;
  return {
    subtotal: order.subtotalPesewas,
    taxes: order.taxes,
    tableTotal: order.totalPesewas,
    share: payment.amountPesewas - tip - fee,
    tip,
    fee,
    paid: payment.amountPesewas,
    stillToPay: Math.max(0, order.totalPesewas - order.paidPesewas),
  };
}
