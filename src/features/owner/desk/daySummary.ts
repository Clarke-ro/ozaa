export type DayOrder = {
  status: string;
  paidPesewas: number;
  createdAt: string;
  paymentStatus: string;
};

export type DeskAlert = {
  code: 'calls' | 'bills' | 'payout' | 'sold_out';
  count?: number;
  detail?: string;
};

export type DaySummary = {
  salesTodayPesewas: number;
  changePercent: number | null;
  direction: 'up' | 'down' | 'flat' | 'none';
  ratingAverage: number | null;
  ratingCount: number;
  alerts: DeskAlert[];
};

function calendarDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function summarizeDay(input: {
  orders: DayOrder[];
  openCalls: number;
  /** Bill requests not yet resolved (open or acknowledged). Only used with payments off. */
  openBillCalls: number;
  /** PAYMENTS_ENABLED. Off: no payout alert, and bills come from bill requests, not payment status. */
  payments: boolean;
  ratings: number[];
  nowIso: string;
  timeZone: string;
  yesterdayPesewas: number;
  payoutVerified: boolean;
  soldOut: string[];
}): DaySummary {
  const today = calendarDay(input.nowIso, input.timeZone);
  const salesTodayPesewas = input.orders.reduce((sum, order) => {
    if (order.status === 'cancelled') return sum;
    if (calendarDay(order.createdAt, input.timeZone) !== today) return sum;
    return sum + order.paidPesewas;
  }, 0);

  let direction: DaySummary['direction'] = 'none';
  let changePercent: number | null = null;
  if (input.yesterdayPesewas > 0) {
    changePercent = Math.round(((salesTodayPesewas - input.yesterdayPesewas) / input.yesterdayPesewas) * 100);
    if (changePercent > 0) direction = 'up';
    else if (changePercent < 0) direction = 'down';
    else direction = 'flat';
  }

  const ratingCount = input.ratings.length;
  const ratingAverage = ratingCount === 0 ? null : input.ratings.reduce((sum, stars) => sum + stars, 0) / ratingCount;
  const alerts: DeskAlert[] = [];
  if (input.openCalls > 0) alerts.push({ code: 'calls', count: input.openCalls });
  // With payments off nothing marks an order paid, so counting unpaid orders would never clear.
  // The guest's bill request is the signal instead, and it clears when staff settle it.
  const bills = input.payments
    ? input.orders.filter(
        (order) => order.status === 'served' && (order.paymentStatus === 'unpaid' || order.paymentStatus === 'part_paid'),
      ).length
    : input.openBillCalls;
  if (bills > 0) alerts.push({ code: 'bills', count: bills });
  if (input.payments && !input.payoutVerified) alerts.push({ code: 'payout' });
  if (input.soldOut.length > 0) alerts.push({ code: 'sold_out', count: input.soldOut.length, detail: input.soldOut.join(', ') });

  return { salesTodayPesewas, changePercent, direction, ratingAverage, ratingCount, alerts };
}
