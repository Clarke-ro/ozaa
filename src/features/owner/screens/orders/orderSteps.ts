import type { Order } from '@/lib/api/types';

export type OrderStepId = 'received' | 'accepted' | 'preparing' | 'ready' | 'served' | 'cancelled';

/** One stage on an order's timeline. `at` is only known for some stages (see below). */
export type OrderStep = { id: OrderStepId; state: 'done' | 'current' | 'todo'; at: string | null };

const FLOW: readonly OrderStepId[] = ['received', 'accepted', 'preparing', 'ready', 'served'];

/**
 * The stages an order goes through, for its own page. The contract keeps three times: when it
 * came in (createdAt), when the food was ready (readyAt) and the last change (updatedAt), which
 * is when it was served or cancelled once it is finished. "Accepted" and "Preparing" have no
 * time of their own.
 */
export function orderSteps(
  order: Pick<Order, 'status' | 'createdAt' | 'updatedAt'> & { readyAt?: string | null },
): OrderStep[] {
  if (order.status === 'cancelled') {
    return [
      { id: 'received', state: 'done', at: order.createdAt },
      { id: 'cancelled', state: 'done', at: order.updatedAt },
    ];
  }
  const reached = FLOW.indexOf(order.status);
  const timeOf = (id: OrderStepId): string | null =>
    id === 'received'
      ? order.createdAt
      : id === 'ready'
        ? (order.readyAt ?? null)
        : id === 'served' && order.status === 'served'
          ? order.updatedAt
          : null;
  return FLOW.map((id, index) => ({
    id,
    state: index <= reached ? 'done' : index === reached + 1 ? 'current' : 'todo',
    at: index <= reached ? timeOf(id) : null,
  }));
}

/** What is still owed on an order, never below zero. */
export function amountDue(order: Pick<Order, 'totalPesewas' | 'paidPesewas'>): number {
  return Math.max(0, order.totalPesewas - order.paidPesewas);
}
