import { Hono, type Context } from 'hono';
import { and, eq, gte, inArray, lt, ne, notInArray, or } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { diningTables, menuItems, orderLines, orders, visits, waiterCalls, writtenReviews } from '../db/schema.ts';
import { orderFromRows } from '../orders/orderStore.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import { calendarDay, summarizeDay } from '../shared/daySummary.ts';
import { deriveFloor } from '../shared/floorStatus.ts';
import { previousWindow, salesReport } from '../shared/sales.ts';
import { tableLink } from '../shared/tableLink.ts';
import type { Order, OwnerDashboard, SalesReport, StaffRole } from '../shared/types.ts';
import { venueRowById } from '../venues/venueData.ts';

const DAY_MS = 86_400_000;

/** Orders with their lines, created in [since, until), plus any still open when `open` is set. */
async function ordersOf(db: Db, venueId: string, range: { since?: Date; until?: Date; open?: boolean }): Promise<Order[]> {
  const inRange = and(
    range.since ? gte(orders.createdAt, range.since) : undefined,
    range.until ? lt(orders.createdAt, range.until) : undefined,
  );
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.venueId, venueId), range.open ? or(inRange, notInArray(orders.status, ['served', 'cancelled'])) : inRange));
  if (rows.length === 0) return [];
  const lines = await db.select().from(orderLines).where(inArray(orderLines.orderId, rows.map((r) => r.id)));
  return rows.map((row) => orderFromRows(row, lines.filter((l) => l.orderId === row.id)));
}

/** The owner home, the floor and Sales (api/openapi.yaml owner-desk). */
export function ownerDeskRoutes(deps: OwnerDeps & { siteUrl: string }) {
  const app = new Hono();
  const { db } = deps;

  const venueFor = async (c: Context, allowed: StaffRole[]) => {
    roleAt(await signedIn(c, deps), c.req.param('venueId') ?? '', allowed);
    return venueRowById(db, c.req.param('venueId') ?? '');
  };

  /** Tables with a status worked out from orders and calls (the shared deriveFloor). */
  const floorOf = async (venueId: string, slug: string, now: number) => {
    const [tables, recent, calls] = await Promise.all([
      db.select().from(diningTables).where(eq(diningTables.venueId, venueId)),
      ordersOf(db, venueId, { since: new Date(now - DAY_MS), open: true }),
      db.select().from(waiterCalls).where(and(eq(waiterCalls.venueId, venueId), ne(waiterCalls.status, 'resolved'))),
    ]);
    tables.sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }));
    const floor = deriveFloor({
      tables: tables.map((t) => ({ id: t.id, code: t.code, label: t.label ?? `Table ${t.code}`, qrUrl: tableLink(deps.siteUrl, slug, t.code) })),
      orders: recent,
      calls: calls.map((call) => ({ ...call, createdAt: call.createdAt.toISOString() })),
      // "Seat a table" by hand is a demo-only tap for now; real tables go busy with their first order.
      seatedCodes: [],
    });
    return floor.map((table) => {
      const call = calls.find((item) => item.id === table.waiterCallId);
      const order = recent.find((item) => item.id === table.orderId);
      // How long the table has been like this: since the call, or since the order last moved.
      const since = table.status === 'needs_waiter' ? (call?.createdAt.toISOString() ?? null) : table.status === 'free' ? null : (order?.updatedAt ?? null);
      return { ...table, since, waiterFirstName: call?.staffFirstName ?? null };
    });
  };

  app.get('/owner/venues/:venueId/floor', async (c) => {
    const venue = await venueFor(c, ROLES.orders);
    return c.json({ items: await floorOf(venue.id, venue.slug, deps.now()) });
  });

  /** Today at a glance. Sales count money already taken; "today" is the venue's own calendar day. */
  app.get('/owner/venues/:venueId/dashboard', async (c) => {
    const venue = await venueFor(c, ROLES.orders);
    const now = deps.now();
    const timeZone = venue.timeZone;
    const [recent, floor, openCalls, reviews, soldOut, visitRows] = await Promise.all([
      ordersOf(db, venue.id, { since: new Date(now - 2 * DAY_MS), open: true }),
      floorOf(venue.id, venue.slug, now),
      db.select({ id: waiterCalls.id }).from(waiterCalls).where(and(eq(waiterCalls.venueId, venue.id), ne(waiterCalls.status, 'resolved'))),
      db.select({ stars: writtenReviews.stars }).from(writtenReviews).where(eq(writtenReviews.venueId, venue.id)),
      db.select({ name: menuItems.name, deletedAt: menuItems.deletedAt }).from(menuItems).where(and(eq(menuItems.venueId, venue.id), eq(menuItems.available, false))),
      db.select({ startedAt: visits.startedAt }).from(visits).where(and(eq(visits.venueId, venue.id), gte(visits.startedAt, new Date(now - 2 * DAY_MS)))),
    ]);
    const today = calendarDay(new Date(now).toISOString(), timeZone);
    const yesterday = calendarDay(new Date(now - DAY_MS).toISOString(), timeZone);
    const yesterdayPesewas = recent
      .filter((o) => o.status !== 'cancelled' && calendarDay(o.createdAt, timeZone) === yesterday)
      .reduce((sum, o) => sum + o.totalPesewas, 0);
    const summary = summarizeDay({
      orders: recent,
      openCalls: openCalls.length,
      ratings: reviews.map((r) => r.stars),
      nowIso: new Date(now).toISOString(),
      timeZone,
      yesterdayPesewas,
      soldOut: soldOut.filter((item) => !item.deletedAt).map((item) => (item.name as { en?: string }).en ?? ''),
    });
    const dashboard: OwnerDashboard = {
      salesTodayPesewas: summary.salesTodayPesewas,
      currency: venue.currency,
      changePercent: summary.changePercent,
      direction: summary.direction,
      openTables: floor.filter((table) => table.status !== 'free').length,
      liveOrders: recent.filter((o) => o.status === 'received' || o.status === 'preparing' || o.status === 'ready').length,
      openCalls: openCalls.length,
      ratingAverage: summary.ratingAverage,
      ratingCount: summary.ratingCount,
      alerts: summary.alerts,
      ordersToday: summary.ordersToday,
      pendingOrders: summary.pendingOrders,
      // A visit is one QR scan or one opened menu link: counted when the guest session starts.
      visitorsToday: visitRows.filter((v) => calendarDay(v.startedAt.toISOString(), timeZone) === today).length,
    };
    return c.json(dashboard);
  });

  /** Sales for a date range, with the same window before it to compare. Owners and managers. */
  app.get('/owner/venues/:venueId/sales', async (c) => {
    const venue = await venueFor(c, ROLES.menu);
    const since = c.req.query('since');
    const until = c.req.query('until');
    const range = (from?: string, to?: string) => ordersOf(db, venue.id, { since: from ? new Date(from) : undefined, until: to ? new Date(to) : undefined });
    const taxEnabled = (venue.tax as { enabled?: boolean } | null)?.enabled ?? false;
    const current = salesReport(await range(since, until), venue.timeZone, { taxEnabled });
    const window = previousWindow(since, until ?? new Date(deps.now()).toISOString());
    const before = window ? salesReport(await range(window.since, window.until), venue.timeZone) : null;
    const report: SalesReport = {
      currency: venue.currency,
      ...current,
      // Refunds happen in each venue's own Paystack dashboard; Cravins doesn't record them yet.
      refundsPesewas: 0,
      previous:
        window && before && before.orderCount > 0
          ? { ...window, orderCount: before.orderCount, valuePesewas: before.valuePesewas, avgPesewas: before.avgPesewas }
          : null,
    };
    return c.json(report);
  });

  /**
   * The old split model's ledger. Each venue now sees its online payments and refunds in its own
   * Paystack dashboard (Clarke, 2026-11-08), so there is nothing to list here.
   */
  app.get('/owner/venues/:venueId/transactions', async (c) => {
    await venueFor(c, ROLES.payments);
    return c.json({ items: [] });
  });

  return app;
}
