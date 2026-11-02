import type {
  FeedbackItem,
  Order,
  OwnerDashboard,
  StaffMember,
  VenueTransaction,
  WaiterCall,
} from '@/lib/api/types';

// A new team member is news for a week; after that they are just on the Staff page.
const JOIN_NEWS_MS = 7 * 86_400_000;

export type NoteSources = {
  orders: Pick<Order, 'id' | 'number' | 'tableCode' | 'status' | 'createdAt' | 'readyAt'>[];
  calls: Pick<WaiterCall, 'id' | 'tableCode' | 'reason' | 'status' | 'createdAt'>[];
  feedback: Pick<
    FeedbackItem,
    'id' | 'sentiment' | 'score' | 'archived' | 'visibleAfter' | 'createdAt'
  >[];
  transactions: Pick<
    VenueTransaction,
    'id' | 'orderNumber' | 'amountPesewas' | 'currency' | 'status' | 'createdAt'
  >[];
  staff: Pick<StaffMember, 'id' | 'firstName' | 'status' | 'joinedAt'>[];
  alerts: OwnerDashboard['alerts'];
};

export type NoteKind =
  | 'sold_out'
  | 'payout'
  | 'call'
  | 'order'
  | 'order_ready'
  | 'payment'
  | 'payment_failed'
  | 'feedback'
  | 'staff_joined'
  | 'staff_invited';

export type Note = {
  id: string;
  kind: NoteKind;
  /** When it happened, or null for a pinned alert that is true right now. */
  at: string | null;
  tone: 'alert' | 'good' | 'info';
  href: string;
  /** Values for the i18n line `ownerNotes.kind.<kind>`; the screen formats money. */
  vars: Record<string, string | number>;
};

/**
 * One feed of what happened across the venue, built only from data the API already sends.
 * Pinned alerts (sold out, payout) come first; everything else is newest first. Things that
 * need no one (served orders, answered calls, archived notes) are left out.
 */
export function buildNotifications(src: NoteSources, now: number): Note[] {
  const pinned: Note[] = [];
  for (const alert of src.alerts) {
    // Calls and bills already show as their own lines below, so only these two are pinned.
    if (alert.code === 'sold_out') {
      pinned.push({
        id: `alert-sold_out-${alert.detail ?? ''}`,
        kind: 'sold_out',
        at: null,
        tone: 'alert',
        href: '/owner/menu',
        vars: { dish: alert.detail ?? '' },
      });
    }
    if (alert.code === 'payout') {
      pinned.push({
        id: 'alert-payout',
        kind: 'payout',
        at: null,
        tone: 'alert',
        href: '/owner/payments',
        vars: {},
      });
    }
  }

  const timed: (Note & { at: string })[] = [];
  for (const c of src.calls) {
    if (c.status !== 'open') continue;
    timed.push({
      id: `call-${c.id}`,
      kind: 'call',
      at: c.createdAt,
      tone: 'alert',
      href: '/owner/calls',
      vars: { table: c.tableCode, reason: c.reason },
    });
  }
  for (const o of src.orders) {
    if (o.status === 'received') {
      timed.push({
        id: `order-${o.id}`,
        kind: 'order',
        at: o.createdAt,
        tone: 'info',
        href: '/owner/orders',
        vars: { number: o.number, table: o.tableCode ?? '' },
      });
    }
    if (o.status === 'ready') {
      timed.push({
        id: `ready-${o.id}`,
        kind: 'order_ready',
        at: o.readyAt ?? o.createdAt,
        tone: 'good',
        href: '/owner/orders',
        vars: { number: o.number, table: o.tableCode ?? '' },
      });
    }
  }
  for (const tx of src.transactions) {
    if (tx.status !== 'succeeded' && tx.status !== 'failed') continue;
    timed.push({
      id: `tx-${tx.id}`,
      kind: tx.status === 'succeeded' ? 'payment' : 'payment_failed',
      at: tx.createdAt,
      tone: tx.status === 'succeeded' ? 'good' : 'alert',
      href: '/owner/payments',
      vars: { number: tx.orderNumber, amount: tx.amountPesewas, currency: tx.currency },
    });
  }
  for (const f of src.feedback) {
    // Notes stay hidden for their privacy delay (visibleAfter), here as everywhere else.
    if (f.archived || Date.parse(f.visibleAfter) > now) continue;
    timed.push({
      id: `fb-${f.id}`,
      kind: 'feedback',
      at: f.visibleAfter,
      tone: f.sentiment === 'negative' ? 'alert' : 'info',
      href: '/owner/feedback',
      vars: { score: f.score, sentiment: f.sentiment },
    });
  }
  for (const s of src.staff) {
    if (s.status === 'invited') {
      timed.push({
        id: `invite-${s.id}`,
        kind: 'staff_invited',
        at: s.joinedAt ?? new Date(now).toISOString(),
        tone: 'info',
        href: '/owner/staff',
        vars: { name: s.firstName },
      });
    } else if (s.status === 'active' && s.joinedAt && now - Date.parse(s.joinedAt) < JOIN_NEWS_MS) {
      timed.push({
        id: `join-${s.id}`,
        kind: 'staff_joined',
        at: s.joinedAt,
        tone: 'good',
        href: '/owner/staff',
        vars: { name: s.firstName },
      });
    }
  }

  timed.sort((a, b) => b.at.localeCompare(a.at));
  return [...pinned, ...timed];
}

/** How many to show on the bell: every pinned alert, plus anything newer than the last visit. */
export function unseenCount(notes: readonly Note[], lastSeenAt: number | null): number {
  return notes.filter((n) => n.at === null || lastSeenAt === null || Date.parse(n.at) > lastSeenAt)
    .length;
}
