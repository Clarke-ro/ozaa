import type { Order, OrderSource } from '@/lib/api/types';

/** Only what the report reads, so tests and the mock can pass small objects. */
export type SalesOrder = Pick<Order, 'status' | 'createdAt' | 'totalPesewas'> & {
  source?: OrderSource;
  paymentStatus?: Order['paymentStatus'];
  paymentMethod?: Order['paymentMethod'];
  deliveryFeePesewas?: number;
  lines: { name: string; quantity: number; totalPesewas: number; discountPesewas?: number }[];
};

export type SalesNumbers = {
  orderCount: number;
  valuePesewas: number;
  byStatus: Record<Order['status'], number>;
  discountsPesewas: number;
  deliveryFeesPesewas: number;
  payments: { onlinePesewas: number; inPersonPesewas: number; unpaidPesewas: number };
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

/**
 * The Sales page figures from a list of orders (already cut to the date range). Money counts
 * every order that wasn't cancelled, paid or not: it is what was ordered. Payments are separate.
 */
export function salesReport(orders: readonly SalesOrder[], timeZone: string): SalesNumbers {
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
    } else {
      payments.unpaidPesewas += order.totalPesewas;
    }
    const source = order.source ?? 'table';
    const s = sources.get(source) ?? { orders: 0, pesewas: 0 };
    sources.set(source, { orders: s.orders + 1, pesewas: s.pesewas + order.totalPesewas });
    const date = venueDate(order.createdAt, timeZone);
    const d = days.get(date) ?? { orders: 0, pesewas: 0 };
    days.set(date, { orders: d.orders + 1, pesewas: d.pesewas + order.totalPesewas });
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
    byStatus,
    discountsPesewas,
    deliveryFeesPesewas,
    payments,
    bySource: [...sources]
      .map(([source, value]) => ({ source, ...value }))
      .sort((a, b) => b.pesewas - a.pesewas),
    topItems: [...items]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.pesewas - a.pesewas)
      .slice(0, TOP),
    days: [...days]
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
