import type { ApiClient } from '@/lib/api/client';
import type { OwnerNotification, StaffRole } from '@/lib/api/types';
import { notificationFeed } from '@/lib/notificationFeed';
import { STAFF } from './demo';
import { accessOf } from './mockRules';
import type { MockContext } from './mockContext';
import type { World } from './worldTypes';

const WINDOW_MS = 24 * 3_600_000;

// What each role may see. Kitchen staff only need orders; waiters also get calls and bills.
const ROLE_KINDS: Record<StaffRole, OwnerNotification['kind'][]> = {
  owner: ['order', 'call', 'bill', 'guest_note', 'review'],
  manager: ['order', 'call', 'bill', 'guest_note', 'review'],
  waiter: ['order', 'call', 'bill'],
  kitchen: ['order'],
  viewer: ['order', 'guest_note', 'review'],
  staff_scanner: [],
};

// The first time someone opens their feed they have already seen anything older than half an
// hour that needs nothing from them, as on the design canvas: a few new rows in bold, the rest
// read. Kept per phone, so marking more as read still works as before.
const SEEN_AFTER_MS = 30 * 60_000;

function seedReads(world: World, venueId: string, phone: string, now: number) {
  if (world.notificationReads.has(phone)) return;
  const read = new Set<string>();
  world.notificationReads.set(phone, read);
  for (const item of feedFor(world, venueId, phone, now)) {
    if (!item.needsAction && now - Date.parse(item.createdAt) > SEEN_AFTER_MS) read.add(item.id);
  }
}

/** The last day's notifications for this venue, as this staff member may see them. */
export function feedFor(world: World, venueId: string, phone: string, now: number) {
  const role = STAFF.find((person) => person.phone === phone)?.role ?? 'viewer';
  const notify = world.profiles.get(phone)?.prefs.notify;
  const since = now - WINDOW_MS;
  const recent = (iso: string) => Date.parse(iso) >= since;
  const feed = notificationFeed(
    {
      orders: world.orders
        .map((row) => row.order)
        .filter((o) => o.venueId === venueId && recent(o.createdAt)),
      calls: world.calls.filter((c) => c.venueId === venueId && recent(c.createdAt)),
      feedback: world.feedback.filter((f) => f.venueId === venueId && recent(f.createdAt)),
      reviews: world.written.filter((r) => r.venueId === venueId && recent(r.createdAt)),
    },
    now,
    world.notificationReads.get(phone) ?? new Set(),
  );
  const allowed = new Set(ROLE_KINDS[role] ?? []);
  return feed.filter((item) => allowed.has(item.kind) && (notify?.[item.kind] ?? true));
}

/** Mock calls: the notification feed and its read state, per staff member. */
export function mockOwnerNotificationCalls(ctx: MockContext) {
  const { world, tokens, now, gate } = ctx;
  return {
    async ownerListNotifications(venueId, query) {
      await gate();
      const { phone } = accessOf(world, tokens);
      seedReads(world, venueId, phone, now());
      const all = feedFor(world, venueId, phone, now());
      const countsByKind: Record<string, number> = {};
      for (const item of all)
        if (!item.readAt) countsByKind[item.kind] = (countsByKind[item.kind] ?? 0) + 1;
      const items = all
        .filter((item) => !query?.kind || item.kind === query.kind)
        .filter((item) => !query?.unread || !item.readAt);
      return {
        items,
        unreadCount: all.filter((item) => !item.readAt).length,
        countsByKind,
        nextCursor: null,
      };
    },
    async ownerMarkNotificationsRead(venueId, ids) {
      await gate();
      const { phone } = accessOf(world, tokens);
      const read = world.notificationReads.get(phone) ?? new Set<string>();
      const all = feedFor(world, venueId, phone, now());
      for (const item of all) if (!ids || ids.includes(item.id)) read.add(item.id);
      world.notificationReads.set(phone, read);
      return { unreadCount: all.filter((item) => !read.has(item.id)).length };
    },
  } satisfies Partial<ApiClient>;
}
