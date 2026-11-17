import type { Order, WaiterCall } from '@/lib/api/types';
import { finishWord } from '@/features/orders/guestTimeline';

export type GuestNoteKind =
  | 'order_sent'
  | 'order_accepted'
  | 'order_cooking'
  | 'order_ready'
  | 'order_served'
  | 'call_sent'
  | 'call_coming';

export type GuestNote = {
  id: string;
  kind: GuestNoteKind;
  at: string;
  /** The venue page it opens, relative to /{venue}/. */
  href: 'status' | 'waiter';
  /** Values for the i18n line `notices.kind.<kind>`. */
  vars: Record<string, string | number>;
};

const STEP: Record<GuestNoteKind, number> = {
  order_sent: 0,
  order_accepted: 1,
  order_cooking: 2,
  order_ready: 3,
  order_served: 4,
  call_sent: 0,
  call_coming: 1,
};

/**
 * The guest's in-app notifications, built from their order and waiter calls (no extra API):
 * order sent, accepted, being prepared, ready, served; call sent and who is coming. Newest first.
 */
export function buildGuestNotes(src: {
  order: Pick<
    Order,
    'id' | 'number' | 'status' | 'createdAt' | 'updatedAt' | 'readyAt' | 'source'
  > | null;
  calls: Pick<
    WaiterCall,
    'id' | 'reason' | 'status' | 'createdAt' | 'acknowledgedAt' | 'staffFirstName'
  >[];
}): GuestNote[] {
  const notes: GuestNote[] = [];
  const o = src.order;
  if (o && o.status !== 'cancelled') {
    const vars = { number: o.number };
    notes.push({ id: `${o.id}-sent`, kind: 'order_sent', at: o.createdAt, href: 'status', vars });
    if (o.status === 'accepted') {
      notes.push({
        id: `${o.id}-accepted`,
        kind: 'order_accepted',
        at: o.updatedAt,
        href: 'status',
        vars,
      });
    }
    if (o.status === 'preparing') {
      notes.push({
        id: `${o.id}-cooking`,
        kind: 'order_cooking',
        at: o.updatedAt,
        href: 'status',
        vars,
      });
    }
    if (o.status === 'ready' || (o.status === 'served' && o.readyAt)) {
      notes.push({
        id: `${o.id}-ready`,
        kind: 'order_ready',
        at: o.readyAt ?? o.updatedAt,
        href: 'status',
        vars,
      });
    }
    if (o.status === 'served') {
      notes.push({
        id: `${o.id}-served`,
        kind: 'order_served',
        at: o.updatedAt,
        href: 'status',
        // Pickup and delivery read "picked up" / "delivered" instead of "served".
        vars: { ...vars, how: finishWord(o.source) },
      });
    }
  }
  for (const c of src.calls) {
    notes.push({
      id: `${c.id}-sent`,
      kind: 'call_sent',
      at: c.createdAt,
      href: 'waiter',
      vars: { reason: c.reason },
    });
    if (c.acknowledgedAt) {
      notes.push({
        id: `${c.id}-coming`,
        kind: 'call_coming',
        at: c.acknowledgedAt,
        href: 'waiter',
        vars: { reason: c.reason, name: c.staffFirstName ?? '' },
      });
    }
  }
  // Newest first; when two share a time, the later step of the story comes first.
  return notes.sort((a, b) => b.at.localeCompare(a.at) || STEP[b.kind] - STEP[a.kind]);
}

/** How many came after the guest last opened their notifications (all of them if never). */
export function unseenGuestNotes(notes: readonly GuestNote[], lastSeenAt: number | null): number {
  return notes.filter((n) => lastSeenAt === null || Date.parse(n.at) > lastSeenAt).length;
}
