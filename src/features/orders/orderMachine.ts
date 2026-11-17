import type { StaffRole } from '@/lib/api/types';

export type OrderStatus = 'received' | 'accepted' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type OrderMove = 'accept' | 'start' | 'ready' | 'serve' | 'cancel';
export type { StaffRole };

const NEXT: Record<OrderStatus, Partial<Record<OrderMove, OrderStatus>>> = {
  // A new order is accepted first (Clarke, 2026-11-17): the guest sees someone has it, and
  // only then can the kitchen start cooking.
  received: { accept: 'accepted', cancel: 'cancelled' },
  accepted: { start: 'preparing', cancel: 'cancelled' },
  preparing: { ready: 'ready', cancel: 'cancelled' },
  ready: { serve: 'served' },
  served: {},
  cancelled: {},
};

const ALLOWED: Record<StaffRole, OrderMove[]> = {
  owner: ['accept', 'start', 'ready', 'serve', 'cancel'],
  manager: ['accept', 'start', 'ready', 'serve', 'cancel'],
  // Whoever sees a new order first, on the floor or in the kitchen, can accept it.
  waiter: ['accept', 'serve'],
  kitchen: ['accept', 'start', 'ready'],
  viewer: [],
  staff_scanner: [],
};

/** The guest banner, including over the game, keys off this and nothing else. */
export function showsFoodReady(status: OrderStatus): boolean {
  return status === 'ready';
}

/**
 * Which order toast a guest sees, if any. One toast at a time: "working" while the kitchen has it,
 * "ready" when it's done, nothing after it's served or cancelled.
 */
export function orderToast(status: OrderStatus): 'working' | 'ready' | null {
  if (status === 'received' || status === 'accepted' || status === 'preparing') return 'working';
  if (status === 'ready') return 'ready';
  return null;
}

const FORWARD: OrderMove[] = ['accept', 'start', 'ready', 'serve'];

export function nextOrderMove(
  status: OrderStatus,
  role: StaffRole,
): { move: OrderMove; status: OrderStatus } | null {
  for (const move of FORWARD) {
    const next = orderTransition(status, move, role);
    if (next) return { move, status: next };
  }
  return null;
}

export function orderTransition(
  status: OrderStatus,
  move: OrderMove,
  role: StaffRole,
): OrderStatus | null {
  if (!ALLOWED[role].includes(move)) return null;
  return NEXT[status][move] ?? null;
}

const MOVE_TO: Partial<Record<OrderStatus, OrderMove>> = {
  accepted: 'accept',
  preparing: 'start',
  ready: 'ready',
  served: 'serve',
  cancelled: 'cancel',
};

/** Staff ask for a status ("set it to accepted"); this is the move that gets there. None reaches received. */
export function moveFor(target: OrderStatus): OrderMove | null {
  return MOVE_TO[target] ?? null;
}
