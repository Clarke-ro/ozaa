import type { SplitMode } from './SplitChoice';

/** How the guest pays, picked on the order page (design canvas, Clarke 2026-11-23). */
export type PayPick = 'momo' | 'cash' | 'card';

export const TIPS = [0, 5, 10, 15] as const;
export type TipPercent = (typeof TIPS)[number];
/** Everything chosen in the payment part of the order page. */
export type PayInput = {
  pick: PayPick;
  mode: SplitMode;
  parts: number;
  tip: TipPercent;
  /** My items: the basket lines (cart keys) this guest pays for. */
  mine: string[];
};

/** What Place order does after the order is made. */
export type PlaceOrderPlan = 'checkout' | 'bill' | 'send';

/**
 * The boxes to show. Cash means paying in person later: at the table, or to the rider on
 * delivery. A pickup order is paid in the app, so nobody can order and walk away (Clarke,
 * 2026-11-16), and a venue that takes no cash never offers it.
 */
export function payMethodsFor(where: {
  table: boolean;
  delivery: boolean;
  cash: boolean;
}): PayPick[] {
  const inPerson = where.cash && (where.table || where.delivery);
  return inPerson ? ['momo', 'cash', 'card'] : ['momo', 'card'];
}

/**
 * MoMo and card open the payment page (Paystack's, with MoMo since 2026-11-23). Cash at a
 * table asks the waiter for the bill; cash on delivery just sends the order.
 */
export function placeOrderPlan(pick: PayPick, where: { table: boolean }): PlaceOrderPlan {
  if (pick !== 'cash') return 'checkout';
  return where.table ? 'bill' : 'send';
}
