import type {
  VenuePublic,
  Order,
  OwnerDashboard,
  VenueTransaction,
  WrittenReview,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { calendarDay, summarizeDay } from '../features/owner/desk/daySummary';
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
  const orders = ordersOf(world, venueId);
  const calls = world.calls.filter((call) => call.venueId === venueId);
  const items = deriveFloor({
    tables,
    orders: orders.map(asFloorOrder),
    calls,
    seatedCodes: world.seatedCodes[venueId] ?? [],
  }).map((table) => {
    // How long the table has been like this: since the call, or since the order last moved.
    const call = calls.find((item) => item.id === table.waiterCallId);
    const order = orders.find((item) => item.id === table.orderId);
    const since =
      table.status === 'needs_waiter'
        ? (call?.createdAt ?? null)
        : table.status === 'free'
          ? null
          : (order?.updatedAt ?? null);
    return { ...table, since, waiterFirstName: call?.staffFirstName ?? null };
  });
  return { items };
}

/** Guest sessions started today (venue's zone). One scan or one opened link is one visit. */
function visitsToday(world: World, venue: VenuePublic, now: number): number {
  const today = calendarDay(new Date(now).toISOString(), venue.hours.timezone);
  let count = 0;
  for (const session of world.sessions.values()) {
    if (
      session.slug === venue.slug &&
      calendarDay(session.startedAt, venue.hours.timezone) === today
    )
      count += 1;
  }
  return count;
}

/** What was ordered (not cancelled) on the venue's calendar day that contains `at`. */
function salesOnDay(orders: Order[], timeZone: string, at: number): number {
  const day = calendarDay(new Date(at).toISOString(), timeZone);
  return orders
    .filter(
      (order) => order.status !== 'cancelled' && calendarDay(order.createdAt, timeZone) === day,
    )
    .reduce((sum, order) => sum + order.totalPesewas, 0);
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
    ratings,
    nowIso: new Date(now).toISOString(),
    timeZone: venue.hours.timezone,
    yesterdayPesewas: salesOnDay(orders, venue.hours.timezone, now - 86_400_000),
    soldOut,
  });
  const liveOrders = orders.filter(
    (order) =>
      order.status === 'received' ||
      order.status === 'accepted' ||
      order.status === 'preparing' ||
      order.status === 'ready',
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
    ordersToday: summary.ordersToday,
    pendingOrders: summary.pendingOrders,
    visitorsToday: visitsToday(world, venue, now),
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
