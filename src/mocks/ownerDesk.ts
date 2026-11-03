import { pesewas } from '@/lib/brand';
import type {
  InsightsReport,
  Order,
  OwnerDashboard,
  VenueTransaction,
  WrittenReview,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { summarizeDay } from '../features/owner/desk/daySummary';
import { deriveFloor, type FloorOrder } from '../features/owner/floor/floorStatus';
import { refundCharge } from '../features/owner/desk/refund';
import { venueById, type World } from './world';

function text(value: { en?: string } | string | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.en ?? '';
}

function ordersOf(world: World, venueId: string): Order[] {
  return world.orders.filter((item) => item.order.venueId === venueId).map((item) => item.order);
}

function asFloorOrder(order: Order): FloorOrder {
  return {
    id: order.id,
    number: order.number,
    tableCode: order.tableCode,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalPesewas: order.totalPesewas,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function floorFor(world: World, venueId: string) {
  const tables = world.tables[venueId] ?? [];
  return {
    items: deriveFloor({
      tables,
      orders: ordersOf(world, venueId).map(asFloorOrder),
      calls: world.calls.filter((call) => call.venueId === venueId),
      seatedCodes: world.seatedCodes[venueId] ?? [],
      payments: PAYMENTS_ENABLED,
    }),
  };
}

export function dashboardFor(world: World, venueId: string, now: number): OwnerDashboard {
  const venue = venueById(world, venueId);
  const orders = ordersOf(world, venueId);
  const floor = floorFor(world, venueId).items;
  const openCalls = world.calls.filter(
    (call) => call.venueId === venueId && call.status !== 'resolved',
  );
  const ratings = world.written
    .filter((review) => review.venueId === venueId)
    .map((review) => review.stars);
  const soldOut = (world.menus[venue.slug]?.items ?? [])
    .filter((item) => !item.available)
    .map((item) => text(item.name));
  const summary = summarizeDay({
    orders,
    openCalls: openCalls.length,
    openBillCalls: openCalls.filter((call) => call.reason === 'bill').length,
    payments: PAYMENTS_ENABLED,
    ratings,
    nowIso: new Date(now).toISOString(),
    timeZone: venue.hours.timezone,
    yesterdayPesewas: world.yesterdayPesewas[venueId] ?? 0,
    payoutVerified: world.payouts[venueId]?.verified ?? false,
    soldOut,
  });
  const liveOrders = orders.filter(
    (order) =>
      order.status === 'received' || order.status === 'preparing' || order.status === 'ready',
  ).length;
  return {
    salesTodayPesewas: summary.salesTodayPesewas,
    currency: venue.currency,
    changePercent: summary.changePercent,
    direction: summary.direction,
    openTables: floor.filter((table) => table.status !== 'free').length,
    liveOrders,
    openCalls: openCalls.length,
    ratingAverage: summary.ratingAverage,
    ratingCount: summary.ratingCount,
    alerts: summary.alerts,
  };
}

export function transactionsFor(world: World, venueId: string): { items: VenueTransaction[] } {
  const items = world.transactions
    .filter((item) => item.venueId === venueId)
    .map(({ venueId: _venue, ...transaction }) => transaction);
  return { items };
}

export function refundFor(world: World, transactionId: string): VenueTransaction {
  const row = world.transactions.find((item) => item.id === transactionId);
  if (!row) throw new ApiError(404, 'payment_not_found', 'Payment not found');
  const result = refundCharge(
    {
      id: row.id,
      amountPesewas: row.amountPesewas,
      status: row.status,
      settlement: row.settlement,
    },
    row.amountPesewas,
  );
  if (!result.ok) throw new ApiError(409, 'illegal_move', 'That payment cannot be refunded');
  row.settlement = 'refunded';
  const live = world.orders.find((item) => item.order.id === row.orderId);
  if (live) {
    const paid = Math.max(0, live.order.paidPesewas - result.refundedPesewas);
    live.order = {
      ...live.order,
      paidPesewas: paid,
      paymentStatus: paid === 0 ? 'refunded' : 'part_paid',
    };
  }
  const { venueId: _venue, ...transaction } = row;
  return transaction;
}

export function writtenFor(world: World, venueId: string): { items: WrittenReview[] } {
  return {
    items: world.written
      .filter((item) => item.venueId === venueId)
      .map(({ venueId: _venue, ...review }) => review),
  };
}

export function replyFor(world: World, reviewId: string, textBody: string): WrittenReview {
  const review = world.written.find((item) => item.id === reviewId);
  if (!review) throw new ApiError(404, 'order_not_found', 'Review not found');
  review.reply = textBody;
  const { venueId: _venue, ...saved } = review;
  return saved;
}

export function insightsFor(
  world: World,
  venueId: string,
  range: InsightsReport['range'],
): InsightsReport {
  const venue = venueById(world, venueId);
  const scale = range === 'today' ? 1 : range === '30d' ? 4 : 2;
  const items = world.menus[venue.slug]?.items ?? [];
  const top = items.slice(0, 3).map((item, index) => ({
    name: text(item.name),
    count: (12 - index * 3) * scale,
    pesewas: pesewas(item.pricePesewas * (8 - index) * scale),
  }));
  const sales = top.reduce((sum, item) => sum + item.pesewas, 0);
  const labels =
    range === 'today'
      ? ['9', '12', '15', '18', '21']
      : range === '30d'
        ? ['W1', 'W2', 'W3', 'W4']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return {
    range,
    currency: venue.currency,
    salesPesewas: pesewas(sales),
    sample: true,
    series: labels.map((label, index) => ({
      label,
      pesewas: pesewas(Math.round(sales / labels.length) + index * 1000),
    })),
    topItems: top,
    peakHours: [
      { hour: 12, orders: 6 * scale },
      { hour: 13, orders: 9 * scale },
      { hour: 19, orders: 11 * scale },
      { hour: 20, orders: 7 * scale },
    ],
    repeatGuests: { count: 14 * scale, sharePercent: range === 'today' ? 18 : 34 },
  };
}
