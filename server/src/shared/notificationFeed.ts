// Generated from src/lib/notificationFeed.ts by scripts/sync-server-shared.mjs. Do not edit here.
import type {
  FeedbackItem,
  Order,
  OwnerNotification,
  WaiterCall,
  WrittenReview,
} from './types.ts';

export type FeedSources = {
  orders: Pick<
    Order,
    'id' | 'number' | 'tableCode' | 'status' | 'paymentStatus' | 'createdAt' | 'source'
  >[];
  calls: Pick<WaiterCall, 'id' | 'tableCode' | 'reason' | 'status' | 'createdAt' | 'note'>[];
  feedback: Pick<
    FeedbackItem,
    'id' | 'sentiment' | 'text' | 'archived' | 'visibleAfter' | 'createdAt'
  >[];
  reviews: Pick<WrittenReview, 'id' | 'stars' | 'firstName' | 'createdAt' | 'reply'>[];
};

const where = (order: { tableCode: string | null; source?: Order['source'] }) =>
  order.tableCode
    ? `Table ${order.tableCode}`
    : order.source === 'delivery'
      ? 'Delivery'
      : 'Pickup';
const short = (text: string) => (text.length > 80 ? `${text.slice(0, 77)}…` : text);

/**
 * One feed for Notifications, the badges and "Needs you", built from the same orders, calls
 * and notes the queues use, so they always agree. Newest first. `read` holds the ids this
 * staff member has read. Guest notes wait until their privacy delay is over.
 */
export function notificationFeed(
  src: FeedSources,
  now: number,
  read: ReadonlySet<string>,
): OwnerNotification[] {
  const items: Omit<OwnerNotification, 'readAt'>[] = [];
  for (const order of src.orders) {
    items.push({
      id: `ntf_order_${order.id}`,
      kind: 'order',
      title: `New order #${order.number} · ${where(order)}`,
      detail: null,
      createdAt: order.createdAt,
      needsAction: order.status === 'received' || order.status === 'ready',
      target: { type: 'order', id: order.id },
    });
  }
  for (const call of src.calls) {
    const bill = call.reason === 'bill';
    items.push({
      id: `ntf_${bill ? 'bill' : 'call'}_${call.id}`,
      kind: bill ? 'bill' : 'call',
      title: bill
        ? `Table ${call.tableCode} wants the bill`
        : `Table ${call.tableCode} needs a waiter`,
      // The guest's own words, when they wrote any. The reason is already in the title's wording.
      detail: call.note ? short(call.note) : null,
      createdAt: call.createdAt,
      needsAction: call.status !== 'resolved',
      target: { type: 'call', id: call.id },
    });
  }
  for (const note of src.feedback) {
    if (Date.parse(note.visibleAfter) > now) continue;
    items.push({
      id: `ntf_note_${note.id}`,
      kind: 'guest_note',
      title: note.sentiment === 'negative' ? 'A guest left a complaint' : 'A guest left a note',
      detail: short(note.text),
      createdAt: note.createdAt,
      needsAction: note.sentiment === 'negative' && !note.archived,
      target: { type: 'feedback', id: note.id },
    });
  }
  for (const review of src.reviews) {
    items.push({
      id: `ntf_review_${review.id}`,
      kind: 'review',
      title: `${review.firstName} gave ${review.stars} stars`,
      detail: null,
      createdAt: review.createdAt,
      needsAction: review.stars <= 3 && !review.reply,
      target: { type: 'review', id: review.id },
    });
  }
  return items
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({ ...item, readAt: read.has(item.id) ? item.createdAt : null }));
}
