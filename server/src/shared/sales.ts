// Generated from src/lib/sales.ts by scripts/sync-server-shared.mjs. Do not edit here.
import type { Order, OrderSource, PaymentMethodUsed, StaffRole } from './types.ts';

/** The staff member who took or moved an order. The mock and server record it; guests don't. */
export type HandledBy = { staffId: string; firstName: string; role: StaffRole };

/** Only what the report reads, so tests and the mock can pass small objects. */
export type SalesOrder = Pick<Order, 'status' | 'createdAt' | 'totalPesewas'> & {
  source?: OrderSource;
  paymentStatus?: Order['paymentStatus'];
  paymentMethod?: Order['paymentMethod'];
  deliveryFeePesewas?: number;
  handledBy?: HandledBy | null;
  taxes?: Order['taxes'];
  lines: { name: string; quantity: number; totalPesewas: number; discountPesewas?: number }[];
};

export type SalesNumbers = {
  orderCount: number;
  valuePesewas: number;
  byStatus: Record<Order['status'], number>;
  discountsPesewas: number;
  deliveryFeesPesewas: number;
  avgPesewas: number;
  payments: {
    onlinePesewas: number;
    inPersonPesewas: number;
    unpaidPesewas: number;
    byMethod: { method: PaymentMethodUsed; orders: number; pesewas: number }[];
  };
  byHour: { hour: number; orders: number; pesewas: number }[];
  byStaff: (HandledBy & { orders: number; pesewas: number })[];
  tax: {
    vatPesewas: number;
    nhilPesewas: number;
    getfundPesewas: number;
    totalPesewas: number;
  } | null;
  bySource: { source: OrderSource; orders: number; pesewas: number }[];
  topItems: { name: string; count: number; pesewas: number }[];
  days: { date: string; orders: number; pesewas: number }[];
};

const TOP = 5;

/** The venue's calendar date, like 2026-11-04, so a late-night order counts on the right day. */
function venueDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/** The hour of the day (0-23) on the venue's clock. */
function venueHour(iso: string, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
  return Number(hour);
}

/** Add one order's money to a running tally kept in a map. */
function tally<K>(map: Map<K, { orders: number; pesewas: number }>, key: K, pesewas: number) {
  const now = map.get(key) ?? { orders: 0, pesewas: 0 };
  map.set(key, { orders: now.orders + 1, pesewas: now.pesewas + pesewas });
}

const biggestFirst = <T extends { pesewas: number }>(a: T, b: T) => b.pesewas - a.pesewas;

/**
 * The window of the same length just before [since, until), for the "vs last period" line.
 * Null without a since: "all time" has nothing before it to compare with.
 */
export function previousWindow(
  since: string | undefined,
  until: string,
): { since: string; until: string } | null {
  if (!since) return null;
  const start = Date.parse(since);
  const length = Date.parse(until) - start;
  return { since: new Date(start - length).toISOString(), until: new Date(start).toISOString() };
}

/**
 * The Sales page figures from a list of orders (already cut to the date range). Money counts
 * every order that wasn't cancelled, paid or not: it is what was ordered. Payments are separate.
 */
export function salesReport(
  orders: readonly SalesOrder[],
  timeZone: string,
  options: { taxEnabled?: boolean } = {},
): SalesNumbers {
  const byStatus: SalesNumbers['byStatus'] = {
    received: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    cancelled: 0,
  };
  const sources = new Map<OrderSource, { orders: number; pesewas: number }>();
  const items = new Map<string, { count: number; pesewas: number }>();
  const days = new Map<string, { orders: number; pesewas: number }>();
  let valuePesewas = 0;
  let discountsPesewas = 0;
  let deliveryFeesPesewas = 0;
  let orderCount = 0;
  const payments = { onlinePesewas: 0, inPersonPesewas: 0, unpaidPesewas: 0 };
  const methods = new Map<PaymentMethodUsed, { orders: number; pesewas: number }>();
  const hours = new Map<number, { orders: number; pesewas: number }>();
  const staff = new Map<string, { who: HandledBy; orders: number; pesewas: number }>();
  const tax = { vatPesewas: 0, nhilPesewas: 0, getfundPesewas: 0 };

  for (const order of orders) {
    byStatus[order.status] += 1;
    if (order.status === 'cancelled') continue;
    orderCount += 1;
    valuePesewas += order.totalPesewas;
    deliveryFeesPesewas += order.deliveryFeePesewas ?? 0;
    // Only a fully paid order counts as paid; part-paid still has money to collect.
    if (order.paymentStatus === 'paid') {
      const online = order.paymentMethod === 'online_card' || order.paymentMethod === 'online_momo';
      if (online) payments.onlinePesewas += order.totalPesewas;
      else payments.inPersonPesewas += order.totalPesewas;
      if (order.paymentMethod) tally(methods, order.paymentMethod, order.totalPesewas);
    } else {
      payments.unpaidPesewas += order.totalPesewas;
    }
    tally(sources, order.source ?? 'table', order.totalPesewas);
    tally(days, venueDate(order.createdAt, timeZone), order.totalPesewas);
    tally(hours, venueHour(order.createdAt, timeZone), order.totalPesewas);
    if (order.handledBy) {
      const who = order.handledBy;
      const row = staff.get(who.staffId) ?? { who, orders: 0, pesewas: 0 };
      staff.set(who.staffId, {
        who,
        orders: row.orders + 1,
        pesewas: row.pesewas + order.totalPesewas,
      });
    }
    for (const line of order.taxes ?? []) {
      if (line.code === 'vat') tax.vatPesewas += line.amountPesewas;
      else if (line.code === 'nhil') tax.nhilPesewas += line.amountPesewas;
      else tax.getfundPesewas += line.amountPesewas;
    }
    for (const line of order.lines) {
      discountsPesewas += line.discountPesewas ?? 0;
      const item = items.get(line.name) ?? { count: 0, pesewas: 0 };
      items.set(line.name, {
        count: item.count + line.quantity,
        pesewas: item.pesewas + line.totalPesewas,
      });
    }
  }

  return {
    orderCount,
    valuePesewas,
    avgPesewas: orderCount === 0 ? 0 : Math.round(valuePesewas / orderCount),
    byStatus,
    discountsPesewas,
    deliveryFeesPesewas,
    payments: {
      ...payments,
      byMethod: [...methods].map(([method, value]) => ({ method, ...value })).sort(biggestFirst),
    },
    byHour: [...hours].map(([hour, value]) => ({ hour, ...value })).sort((a, b) => a.hour - b.hour),
    byStaff: [...staff.values()]
      .map(({ who, orders: count, pesewas }) => ({ ...who, orders: count, pesewas }))
      .sort(biggestFirst),
    // E-VAT only shows once the venue switched tax on; before that the lines are empty anyway.
    tax: options.taxEnabled
      ? { ...tax, totalPesewas: tax.vatPesewas + tax.nhilPesewas + tax.getfundPesewas }
      : null,
    bySource: [...sources].map(([source, value]) => ({ source, ...value })).sort(biggestFirst),
    topItems: [...items]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.pesewas - a.pesewas)
      .slice(0, TOP),
    days: [...days]
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
