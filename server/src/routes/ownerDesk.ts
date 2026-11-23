import { Hono, type Context } from 'hono';
import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { feedback, orderLines, orders, visits } from '../db/schema.ts';
import { orderFromRows } from '../orders/orderStore.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import { previousWindow, salesReport } from '../shared/sales.ts';
import { insightsReport, rangeWindow } from '../shared/insights.ts';
import { loadLoyalty } from '../loyalty/store.ts';
import { Problem } from '../http/problem.ts';
import { memoFor } from '../http/venueMemo.ts';
import type { Order, SalesReport, StaffRole } from '../shared/types.ts';
import { venueRowById } from '../venues/venueData.ts';
import { dashboardOf, floorOf } from './deskStats.ts';

/** Orders with their lines, created in [since, until). Sales and Insights still need the dishes. */
async function ordersOf(
  db: Db,
  venueId: string,
  range: { since?: Date; until?: Date },
): Promise<Order[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.venueId, venueId),
        range.since ? gte(orders.createdAt, range.since) : undefined,
        range.until ? lt(orders.createdAt, range.until) : undefined,
      ),
    );
  if (rows.length === 0) return [];
  const lines = await db
    .select()
    .from(orderLines)
    .where(
      inArray(
        orderLines.orderId,
        rows.map((r) => r.id),
      ),
    );
  const byOrder = new Map<string, typeof lines>();
  for (const line of lines) {
    const list = byOrder.get(line.orderId);
    if (list) list.push(line);
    else byOrder.set(line.orderId, [line]);
  }
  return rows.map((row) => orderFromRows(row, byOrder.get(row.id) ?? []));
}

/** Several staff phones poll the home page together. One answer serves them for a few seconds. */
const DASHBOARD_TTL_MS = 4_000;

/**
 * The shared home-page answers. The app clears it after any staff change (app.ts), so the person
 * who just acted sees the badges move at once; only plain polling shares the few-second answer.
 */
export const dashboardMemo = (now: () => number) =>
  memoFor<Awaited<ReturnType<typeof dashboardOf>>>(DASHBOARD_TTL_MS, now);

/** The owner home, the floor and Sales (api/openapi.yaml owner-desk). */
export function ownerDeskRoutes(
  deps: OwnerDeps & { siteUrl: string; dashboardCache?: ReturnType<typeof dashboardMemo> },
) {
  const app = new Hono();
  const { db } = deps;
  const dashboardCache = deps.dashboardCache ?? dashboardMemo(deps.now);

  const venueFor = async (c: Context, allowed: StaffRole[]) => {
    roleAt(await signedIn(c, deps), c.req.param('venueId') ?? '', allowed);
    return venueRowById(db, c.req.param('venueId') ?? '');
  };

  app.get('/owner/venues/:venueId/floor', async (c) => {
    const venue = await venueFor(c, ROLES.orders);
    const floor = await floorOf(db, venue.id, venue.slug, deps.now(), deps.siteUrl);
    return c.json({ items: floor.items });
  });

  /**
   * Today at a glance. Sales count money already taken; "today" is the venue's own calendar day.
   * The sums are done in Postgres, then kept for a few seconds so every phone on the desk shares them.
   */
  app.get('/owner/venues/:venueId/dashboard', async (c) => {
    const venue = await venueFor(c, ROLES.orders);
    const now = deps.now();
    return c.json(
      await dashboardCache.read(venue.id, () => dashboardOf(db, venue, now, deps.siteUrl)),
    );
  });

  /** Sales for a date range, with the same window before it to compare. Owners and managers. */
  app.get('/owner/venues/:venueId/sales', async (c) => {
    const venue = await venueFor(c, ROLES.menu);
    const since = c.req.query('since');
    const until = c.req.query('until');
    const range = (from?: string, to?: string) =>
      ordersOf(db, venue.id, {
        since: from ? new Date(from) : undefined,
        until: to ? new Date(to) : undefined,
      });
    const taxEnabled = (venue.tax as { enabled?: boolean } | null)?.enabled ?? false;
    const current = salesReport(await range(since, until), venue.timeZone, { taxEnabled });
    const window = previousWindow(since, until ?? new Date(deps.now()).toISOString());
    const before = window
      ? salesReport(await range(window.since, window.until), venue.timeZone)
      : null;
    const report: SalesReport = {
      currency: venue.currency,
      ...current,
      // Refunds happen in each venue's own Paystack dashboard; Cravins doesn't record them yet.
      refundsPesewas: 0,
      previous:
        window && before && before.orderCount > 0
          ? {
              ...window,
              orderCount: before.orderCount,
              valuePesewas: before.valuePesewas,
              avgPesewas: before.avgPesewas,
            }
          : null,
    };
    return c.json(report);
  });

  /**
   * Insights for a range: sales, top dishes, peak hours, the visit-to-order funnel, guest mood and
   * repeat guests (loyalty members with two or more paid visits). The shared insightsReport.
   */
  app.get('/owner/venues/:venueId/insights', async (c) => {
    const venue = await venueFor(c, ROLES.menu);
    const range = (c.req.query('range') ?? '7d') as 'today' | '7d' | '30d' | '90d' | 'custom';
    if (!['today', '7d', '30d', '90d', 'custom'].includes(range))
      throw new Problem(400, 'validation', 'Pick a range.');
    const now = deps.now();
    const since = c.req.query('since');
    const until = c.req.query('until');
    if (range === 'custom' && (!since || !until))
      throw new Problem(400, 'validation', 'Pick a start and end date.');
    // A preset range runs up to and including this moment, so a visit made just now counts.
    const span =
      range === 'custom'
        ? { since: since!, until: until! }
        : rangeWindow(range, now + 1, venue.timeZone);
    const from = new Date(span.since);
    const to = new Date(span.until);
    const [orderList, visitRows, notes, loyalty] = await Promise.all([
      ordersOf(db, venue.id, { since: from, until: to }),
      db
        .select({ startedAt: visits.startedAt })
        .from(visits)
        .where(
          and(eq(visits.venueId, venue.id), gte(visits.startedAt, from), lt(visits.startedAt, to)),
        ),
      db
        .select({ sentiment: feedback.sentiment, createdAt: feedback.createdAt })
        .from(feedback)
        .where(
          and(
            eq(feedback.venueId, venue.id),
            gte(feedback.createdAt, from),
            lt(feedback.createdAt, to),
          ),
        ),
      db.transaction((tx) => loadLoyalty(tx, venue.id, venue.currency, 'all')),
    ]);
    let visited = 0;
    let repeat = 0;
    for (const member of Object.values(loyalty.members)) {
      const paidVisits = member.facts.filter(
        (f) =>
          f.kind === 'earn' &&
          f.source.type === 'paid_visit' &&
          Date.parse(f.at) >= from.getTime() &&
          Date.parse(f.at) < to.getTime(),
      ).length;
      if (paidVisits > 0) visited += 1;
      if (paidVisits > 1) repeat += 1;
    }
    const report = insightsReport({
      range,
      since: span.since,
      until: span.until,
      timeZone: venue.timeZone,
      orders: orderList,
      visits: visitRows.map((v) => ({ startedAt: v.startedAt.toISOString() })),
      feedback: notes.map((n) => ({
        sentiment: n.sentiment,
        createdAt: n.createdAt.toISOString(),
      })),
      repeatGuests: {
        count: repeat,
        sharePercent: visited === 0 ? 0 : Math.round((repeat / visited) * 100),
      },
    });
    return c.json({ ...report, currency: venue.currency });
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
