export type OrderStatus = 'received' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type OrderMove = 'start' | 'ready' | 'serve' | 'cancel';
export type StaffRole = 'owner' | 'manager' | 'waiter' | 'kitchen';

const NEXT: Record<OrderStatus, Partial<Record<OrderMove, OrderStatus>>> = {
  received: { start: 'preparing', cancel: 'cancelled' },
  preparing: { ready: 'ready', cancel: 'cancelled' },
  ready: { serve: 'served' },
  served: {},
  cancelled: {},
};

const ALLOWED: Record<StaffRole, OrderMove[]> = {
  owner: ['start', 'ready', 'serve', 'cancel'],
  manager: ['start', 'ready', 'serve', 'cancel'],
  waiter: ['serve'],
  kitchen: ['start', 'ready'],
};

/** The guest banner, including over the game, keys off this and nothing else. */
export function showsFoodReady(status: OrderStatus): boolean {
  return status === 'ready';
}

const FORWARD: OrderMove[] = ['start', 'ready', 'serve'];

export function nextOrderMove(status: OrderStatus, role: StaffRole): { move: OrderMove; status: OrderStatus } | null {
  for (const move of FORWARD) {
    const next = orderTransition(status, move, role);
    if (next) return { move, status: next };
  }
  return null;
}

export function orderTransition(status: OrderStatus, move: OrderMove, role: StaffRole): OrderStatus | null {
  if (!ALLOWED[role].includes(move)) return null;
  return NEXT[status][move] ?? null;
}
