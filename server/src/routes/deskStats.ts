import { and, eq, gte, lt, ne, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { diningTables, menuItems, visits, waiterCalls, writtenReviews } from '../db/schema.ts';
import { calendarDay, type DeskAlert } from '../shared/daySummary.ts';
import { deriveFloor, type FloorOrder } from '../shared/floorStatus.ts';
import { tableLink } from '../shared/tableLink.ts';
import type { OwnerDashboard } from '../shared/types.ts';
import { zonedDayRange } from '../http/zonedDay.ts';

const DAY_MS = 86_400_000;

export type OrderTotals = {
  salesTodayPesewas: number;
  ordersToday: number;
  yesterdayPesewas: number;
  pendingOrders: number;
  bills: number;
  liveOrders: number;
};

type VenueBits = {
  id: string;
  slug: string;
  currency: OwnerDashboard['currency'];
  timeZone: string;
};

/** One row from `db.execute`, whether the driver returns an array or `{ rows }`. */
function firstRow(result: unknown): Record<string, unknown> {
  const list = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return (list[0] ?? {}) as Record<string, unknown>;
}

function num(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  return value == null ? 0 : Number(value);
}

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function payStatus(paid: number, total: number): FloorOrder['paymentStatus'] {
  if (paid <= 0) return 'unpaid';
  return paid >= total ? 'paid' : 'part_paid';
}

/**
 * Today's sales, yesterday's sales, and the open-order counts, added up in Postgres.
 * Same rules as loading the rows and running `summarizeDay`: "today" is the venue's calendar day,
 * a bill is a served order that still owes money and was placed in the last two days, and an
 * order the kitchen has not finished counts however old it is.
 */
export async function orderTotals(
  db: Db,
  venueId: string,
  now: number,
  timeZone: string,
): Promise<OrderTotals> {
  const today = calendarDay(new Date(now).toISOString(), timeZone);
  const yesterday = calendarDay(new Date(now - DAY_MS).toISOString(), timeZone);
  const todayRange = zonedDayRange(today, timeZone);
  const yesterdayRange = zonedDayRange(yesterday, timeZone);
  const since = new Date(now - 2 * DAY_MS);
  const row = firstRow(
    await db.execute(sql`
      select
        coalesce(sum(paid_pesewas) filter (
          where status <> 'cancelled'
            and created_at >= ${todayRange.start}
            and created_at < ${todayRange.end}
        ), 0)::bigint as sales_today,
        count(*) filter (
          where status <> 'cancelled'
            and created_at >= ${todayRange.start}
            and created_at < ${todayRange.end}
        )::int as orders_today,
        coalesce(sum(total_pesewas) filter (
          where status <> 'cancelled'
            and created_at >= ${yesterdayRange.start}
            and created_at < ${yesterdayRange.end}
            and created_at >= ${since}
        ), 0)::bigint as yesterday_total,
        count(*) filter (where status = 'received')::int as pending,
        count(*) filter (
          where status = 'served'
            and created_at >= ${since}
            and (paid_pesewas = 0 or paid_pesewas < total_pesewas)
        )::int as bills,
        count(*) filter (
          where status in ('received', 'accepted', 'preparing', 'ready')
        )::int as live
      from orders
      where venue_id = ${venueId}
        and (created_at >= ${since} or status not in ('served', 'cancelled'))
    `),
  );
  return {
    salesTodayPesewas: num(row, 'sales_today'),
    ordersToday: num(row, 'orders_today'),
    yesterdayPesewas: num(row, 'yesterday_total'),
    pendingOrders: num(row, 'pending'),
    bills: num(row, 'bills'),
    liveOrders: num(row, 'live'),
  };
}

/**
 * The latest order that still matters for each table: anything from the last day, plus any order
 * the kitchen has not finished. One row per table, no dish lines. The floor only needs that.
 */
export async function latestTableOrders(
  db: Db,
  venueId: string,
  since: Date,
): Promise<FloorOrder[]> {
  const result = await db.execute(sql`
    select distinct on (table_code)
      id, number, table_code, status, total_pesewas, paid_pesewas, created_at, updated_at
    from orders
    where venue_id = ${venueId}
      and table_code is not null
      and status <> 'cancelled'
      and (created_at >= ${since} or status not in ('served', 'cancelled'))
    order by table_code, updated_at desc
  `);
  const list = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return (list as Record<string, unknown>[]).map((row) => {
    const paid = Number(row.paid_pesewas ?? 0);
    const total = Number(row.total_pesewas ?? 0);
    return {
      id: String(row.id),
      number: Number(row.number),
      tableCode: row.table_code == null ? null : String(row.table_code),
      status: String(row.status) as FloorOrder['status'],
      paymentStatus: payStatus(paid, total),
      totalPesewas: total,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  });
}

/** Tables with a status worked out from orders and calls (the shared deriveFloor). */
export async function floorOf(db: Db, venueId: string, slug: string, now: number, siteUrl: string) {
  const [tables, recent, calls] = await Promise.all([
    db.select().from(diningTables).where(eq(diningTables.venueId, venueId)),
    latestTableOrders(db, venueId, new Date(now - DAY_MS)),
    db
      .select()
      .from(waiterCalls)
      .where(and(eq(waiterCalls.venueId, venueId), ne(waiterCalls.status, 'resolved'))),
  ]);
  tables.sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }));
  const floor = deriveFloor({
    tables: tables.map((table) => ({
      id: table.id,
      code: table.code,
      label: table.label ?? `Table ${table.code}`,
      qrUrl: tableLink(siteUrl, slug, table.code),
    })),
    orders: recent,
    calls: calls.map((call) => ({ ...call, createdAt: call.createdAt.toISOString() })),
    seatedCodes: [],
  });
  const items = floor.map((table) => {
    const call = calls.find((item) => item.id === table.waiterCallId);
    const order = recent.find((item) => item.id === table.orderId);
    const since =
      table.status === 'needs_waiter'
        ? (call?.createdAt.toISOString() ?? null)
        : table.status === 'free'
          ? null
          : (order?.updatedAt ?? null);
    return { ...table, since, waiterFirstName: call?.staffFirstName ?? null };
  });
  return { items, openCalls: calls.length };
}

/** The owner home. Totals come from SQL. The floor is the same query the floor page uses. */
export async function dashboardOf(
  db: Db,
  venue: VenueBits,
  now: number,
  siteUrl: string,
): Promise<OwnerDashboard> {
  const todayRange = zonedDayRange(
    calendarDay(new Date(now).toISOString(), venue.timeZone),
    venue.timeZone,
  );
  const [totals, floor, reviews, soldOut, visitCount] = await Promise.all([
    orderTotals(db, venue.id, now, venue.timeZone),
    floorOf(db, venue.id, venue.slug, now, siteUrl),
    db
      .select({
        n: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${writtenReviews.stars}), 0)::int`,
      })
      .from(writtenReviews)
      .where(eq(writtenReviews.venueId, venue.id)),
    db
      .select({ name: menuItems.name, deletedAt: menuItems.deletedAt })
      .from(menuItems)
      .where(and(eq(menuItems.venueId, venue.id), eq(menuItems.available, false))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(visits)
      .where(
        and(
          eq(visits.venueId, venue.id),
          gte(visits.startedAt, todayRange.start),
          lt(visits.startedAt, todayRange.end),
        ),
      ),
  ]);
  const ratingCount = Number(reviews[0]?.n ?? 0);
  const ratingTotal = Number(reviews[0]?.total ?? 0);
  let direction: OwnerDashboard['direction'] = 'none';
  let changePercent: number | null = null;
  if (totals.yesterdayPesewas > 0) {
    changePercent = Math.round(
      ((totals.salesTodayPesewas - totals.yesterdayPesewas) / totals.yesterdayPesewas) * 100,
    );
    if (changePercent > 0) direction = 'up';
    else if (changePercent < 0) direction = 'down';
    else direction = 'flat';
  }
  const soldOutNames = soldOut
    .filter((item) => !item.deletedAt)
    .map((item) => (item.name as { en?: string }).en ?? '');
  const alerts: DeskAlert[] = [];
  if (floor.openCalls > 0) alerts.push({ code: 'calls', count: floor.openCalls });
  if (totals.bills > 0) alerts.push({ code: 'bills', count: totals.bills });
  if (soldOutNames.length > 0)
    alerts.push({ code: 'sold_out', count: soldOutNames.length, detail: soldOutNames.join(', ') });
  return {
    salesTodayPesewas: totals.salesTodayPesewas,
    currency: venue.currency,
    changePercent,
    direction,
    openTables: floor.items.filter((table) => table.status !== 'free').length,
    liveOrders: totals.liveOrders,
    openCalls: floor.openCalls,
    ratingAverage: ratingCount === 0 ? null : ratingTotal / ratingCount,
    ratingCount,
    alerts,
    ordersToday: totals.ordersToday,
    pendingOrders: totals.pendingOrders,
    visitorsToday: Number(visitCount[0]?.n ?? 0),
  };
}
