import type { Order, VenueTransaction, WaiterCall } from '@/lib/api/types';

export type OrderTab = 'new' | 'cooking' | 'ready' | 'done';

/** Which Orders tab a ticket belongs in. Served and cancelled tickets leave the live tabs. */
export function orderTab(status: Order['status']): OrderTab {
  switch (status) {
    case 'received':
      return 'new';
    case 'preparing':
      return 'cooking';
    case 'ready':
      return 'ready';
    default:
      return 'done';
  }
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
