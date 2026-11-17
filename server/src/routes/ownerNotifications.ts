import { Hono, type Context } from 'hono';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { feedback, notificationReads, notifications, orders, waiterCalls, writtenReviews } from '../db/schema.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import { notificationFeed } from '../shared/notificationFeed.ts';
import type { OwnerNotification, StaffPrefs, StaffRole } from '../shared/types.ts';

const WINDOW_MS = 24 * 3_600_000;
// The first time someone opens their feed, anything older than half an hour that needs nothing
// from them counts as already seen: a few new rows in bold, the rest read (as the demo does).
const SEEN_AFTER_MS = 30 * 60_000;

// What each role may see. Kitchen staff only need orders; waiters also get calls and bills.
const ROLE_KINDS: Record<StaffRole, OwnerNotification['kind'][]> = {
  owner: ['order', 'call', 'bill', 'guest_note', 'review'],
  manager: ['order', 'call', 'bill', 'guest_note', 'review'],
  waiter: ['order', 'call', 'bill'],
  kitchen: ['order'],
  viewer: ['order', 'guest_note', 'review'],
  staff_scanner: [],
};

/**
 * The owner app's notifications (api/openapi.yaml owner notifications). The feed is built each time
 * from the last day's orders, calls, notes and reviews (the shared notificationFeed), so it always
 * agrees with the queues. Only who has read what is stored, per staff member.
 */
export function ownerNotificationRoutes(deps: OwnerDeps) {
  const app = new Hono();
  const { db } = deps;

  const feedFor = async (c: Context) => {
    const who = await signedIn(c, deps);
    const venueId = c.req.param('venueId') ?? '';
    const role = roleAt(who, venueId, [...ROLES.orders, 'staff_scanner']);
    const now = deps.now();
    const since = new Date(now - WINDOW_MS);
    const [orderRows, callRows, noteRows, reviewRows] = await Promise.all([
      db.select().from(orders).where(and(eq(orders.venueId, venueId), gte(orders.createdAt, since))),
      db.select().from(waiterCalls).where(and(eq(waiterCalls.venueId, venueId), gte(waiterCalls.createdAt, since))),
      db.select().from(feedback).where(and(eq(feedback.venueId, venueId), gte(feedback.createdAt, since))),
      db.select().from(writtenReviews).where(and(eq(writtenReviews.venueId, venueId), gte(writtenReviews.createdAt, since))),
    ]);
    const iso = (d: Date) => d.toISOString();
    const sources = {
      orders: orderRows.map((o) => ({ id: o.id, number: o.number, tableCode: o.tableCode, status: o.status, paymentStatus: o.paidPesewas <= 0 ? ('unpaid' as const) : o.paidPesewas >= o.totalPesewas ? ('paid' as const) : ('part_paid' as const), createdAt: iso(o.createdAt), source: o.source })),
      calls: callRows.map((x) => ({ id: x.id, tableCode: x.tableCode, reason: x.reason, status: x.status, createdAt: iso(x.createdAt), ...(x.note ? { note: x.note } : {}) })),
      feedback: noteRows.map((n) => ({ id: n.id, sentiment: n.sentiment, text: n.text, archived: n.archived, visibleAfter: iso(n.visibleAfter), createdAt: iso(n.createdAt) })),
      reviews: reviewRows.map((r) => ({ id: r.id, stars: r.stars, firstName: r.firstName, createdAt: iso(r.createdAt), reply: r.reply })),
    };
    // Which of these this person has read, then the feed with readAt filled in.
    const draft = notificationFeed(sources, now, new Set());
    const ids = draft.map((item) => item.id);
    const reads = ids.length
      ? await db.select().from(notificationReads).where(and(eq(notificationReads.userId, who.user.id), inArray(notificationReads.notificationId, ids)))
      : [];
    const readAt = new Map(reads.map((r) => [r.notificationId, r.readAt.toISOString()]));
    const anyRead = await db
      .select({ id: notificationReads.notificationId })
      .from(notificationReads)
      .innerJoin(notifications, eq(notifications.id, notificationReads.notificationId))
      .where(and(eq(notificationReads.userId, who.user.id), eq(notifications.venueId, venueId)))
      .limit(1);
    const firstLook = anyRead.length === 0;
    const notify = (who.user.prefs as StaffPrefs | null)?.notify as Partial<Record<OwnerNotification['kind'], boolean>> | undefined;
    const allowed = new Set(ROLE_KINDS[role]);
    const items = draft
      .filter((item) => allowed.has(item.kind) && (notify?.[item.kind] ?? true))
      .map((item) => {
        const seen = readAt.get(item.id) ?? (firstLook && !item.needsAction && now - Date.parse(item.createdAt) > SEEN_AFTER_MS ? item.createdAt : null);
        return { ...item, readAt: seen };
      });
    return { who, venueId, items };
  };

  app.get('/owner/venues/:venueId/notifications', async (c) => {
    const { items } = await feedFor(c);
    const countsByKind: Record<string, number> = {};
    for (const item of items) if (!item.readAt) countsByKind[item.kind] = (countsByKind[item.kind] ?? 0) + 1;
    const kind = c.req.query('kind');
    const unread = c.req.query('unread') === 'true';
    return c.json({
      items: items.filter((item) => (!kind || item.kind === kind) && (!unread || !item.readAt)),
      unreadCount: items.filter((item) => !item.readAt).length,
      countsByKind,
      nextCursor: null,
    });
  });

  /** Marks some or all as read for this person: each item is kept as a row so the read can point at it. */
  app.post('/owner/venues/:venueId/notifications/read', async (c) => {
    const { who, venueId, items } = await feedFor(c);
    const input = z.object({ ids: z.array(z.string()).max(500).optional() }).safeParse(await c.req.json().catch(() => ({})));
    const wanted = input.success && input.data.ids ? new Set(input.data.ids) : null;
    const marking = items.filter((item) => !item.readAt && (!wanted || wanted.has(item.id)));
    if (marking.length) {
      await db
        .insert(notifications)
        .values(marking.map((item) => ({ id: item.id, venueId, kind: item.kind, title: item.title, detail: item.detail ?? null, targetType: item.target.type, targetId: item.target.id, createdAt: new Date(item.createdAt) })))
        .onConflictDoNothing();
      await db
        .insert(notificationReads)
        .values(marking.map((item) => ({ notificationId: item.id, userId: who.user.id, readAt: new Date(deps.now()) })))
        .onConflictDoNothing();
    }
    return c.json({ unreadCount: items.filter((item) => !item.readAt).length - marking.length });
  });

  return app;
}
