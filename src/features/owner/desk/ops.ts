import type { Order, VenueTransaction, WaiterCall } from '@/lib/api/types';

export type OrderTab = 'new' | 'cooking' | 'ready' | 'served' | 'rejected';
/** A tab on the Orders screen: one stage, or every order. */
export type OrderView = OrderTab | 'all';

export const ORDER_VIEWS: readonly OrderView[] = [
  'new',
  'cooking',
  'ready',
  'served',
  'rejected',
  'all',
];

/** Which Orders tab a ticket belongs in. A cancelled order shows as Rejected to staff. */
export function orderTab(status: Order['status']): OrderTab {
  switch (status) {
    case 'received':
      return 'new';
    case 'preparing':
      return 'cooking';
    case 'ready':
      return 'ready';
    case 'served':
      return 'served';
    case 'cancelled':
      return 'rejected';
  }
}

/** How many orders sit in each tab, for the numbers on the tabs. */
export function orderTabCounts(
  orders: readonly Pick<Order, 'status'>[],
): Record<OrderView, number> {
  const counts: Record<OrderView, number> = {
    new: 0,
    cooking: 0,
    ready: 0,
    served: 0,
    rejected: 0,
    all: orders.length,
  };
  for (const order of orders) counts[orderTab(order.status)] += 1;
  return counts;
}

export type TicketAge = { minutes: number; tone: 'ok' | 'late' | 'very_late' };

/**
 * How long a ticket has waited. A kitchen ticket over 10 minutes needs a look and over 20 needs
 * someone to act, so the card turns amber and then red. Clock drift never shows a negative age.
 */
export function ticketAge(createdAt: string, now: number): TicketAge {
  const minutes = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 60_000));
  return { minutes, tone: minutes >= 20 ? 'very_late' : minutes >= 10 ? 'late' : 'ok' };
}

/** Average minutes from a guest calling to someone picking it up. Calls nobody picked up are left out. */
export function averageResponseMinutes(
  calls: Pick<WaiterCall, 'createdAt' | 'acknowledgedAt'>[],
): number | null {
  const waits = calls.flatMap((c) =>
    c.acknowledgedAt ? [(Date.parse(c.acknowledgedAt) - Date.parse(c.createdAt)) / 60_000] : [],
  );
  if (!waits.length) return null;
  return Math.round(waits.reduce((sum, w) => sum + w, 0) / waits.length);
}

type Tx = Pick<VenueTransaction, 'status' | 'settlement'>;

/** Only a payment that went through, and is not refunded already, can be refunded. */
export function canRefund(tx: {
  status: Tx['status'] | string;
  settlement: Tx['settlement'] | string;
}): boolean {
  return tx.status === 'succeeded' && tx.settlement !== 'refunded';
}

/** Money that came in, money already paid out to the venue, and money given back. Only `succeeded` counts. */
export function moneyTotals(txs: { amountPesewas: number; status: string; settlement: string }[]) {
  return txs.reduce(
    (sum, tx) => {
      if (tx.status !== 'succeeded') return sum;
      if (tx.settlement === 'refunded')
        return { ...sum, refunded: sum.refunded + tx.amountPesewas };
      return {
        collected: sum.collected + tx.amountPesewas,
        settled: sum.settled + (tx.settlement === 'settled' ? tx.amountPesewas : 0),
        refunded: sum.refunded,
      };
    },
    { collected: 0, settled: 0, refunded: 0 },
  );
}
