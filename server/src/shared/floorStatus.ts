// Generated from src/features/owner/floor/floorStatus.ts by scripts/sync-server-shared.mjs. Do not edit here.
export type FloorStatus = 'free' | 'seated' | 'ordered' | 'waiting_to_pay' | 'needs_waiter';

export type FloorOrder = {
  id: string;
  number: number;
  tableCode: string | null;
  status: 'received' | 'preparing' | 'ready' | 'served' | 'cancelled';
  paymentStatus: 'unpaid' | 'part_paid' | 'paid' | 'refunded';
  totalPesewas: number;
  createdAt: string;
  updatedAt: string;
};

export type FloorCall = {
  id: string;
  tableCode: string;
  reason: 'water' | 'bill' | 'cutlery' | 'order_more' | 'clean_table' | 'other';
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
};

export type FloorTableInput = {
  id: string;
  code: string;
  label?: string;
  qrUrl?: string;
};

export type FloorTableView = FloorTableInput & {
  status: FloorStatus;
  orderId: string | null;
  orderNumber: number | null;
  orderStatus: FloorOrder['status'] | null;
  paymentStatus: FloorOrder['paymentStatus'] | null;
  billPesewas: number | null;
  waiterCallId: string | null;
  waiterReason: FloorCall['reason'] | null;
};

const OPEN_KITCHEN = new Set<FloorOrder['status']>(['received', 'preparing', 'ready']);

function latestOrder(orders: FloorOrder[], code: string): FloorOrder | null {
  const matches = orders.filter(
    (order) => order.tableCode === code && order.status !== 'cancelled',
  );
  matches.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return matches[0] ?? null;
}

function fromOrder(order: FloorOrder | null, seated: boolean): FloorStatus {
  if (!order) return seated ? 'seated' : 'free';
  if (OPEN_KITCHEN.has(order.status)) return 'ordered';
  if (
    order.status === 'served' &&
    (order.paymentStatus === 'unpaid' || order.paymentStatus === 'part_paid')
  ) {
    return 'waiting_to_pay';
  }
  return seated ? 'seated' : 'free';
}

/**
 * Floor status is derived. Orders and waiter calls stay the source of truth,
 * so a table cannot be stored as both free and waiting to pay.
 */
export function deriveFloor(input: {
  tables: FloorTableInput[];
  orders: FloorOrder[];
  calls: FloorCall[];
  seatedCodes: readonly string[];
}): FloorTableView[] {
  const seated = new Set(input.seatedCodes);
  return input.tables.map((table) => {
    const order = latestOrder(input.orders, table.code);
    const tableCalls = input.calls.filter((item) => item.tableCode === table.code);
    const call = tableCalls.find((item) => item.status !== 'resolved') ?? null;
    // A served bill frees the table once it's paid, online or marked paid by staff (Clarke,
    // 2026-11-08). A bill request is a call like any other, so it shows as needing a waiter.
    const status: FloorStatus = call ? 'needs_waiter' : fromOrder(order, seated.has(table.code));
    return {
      ...table,
      status,
      orderId: order?.id ?? null,
      orderNumber: order?.number ?? null,
      orderStatus: order?.status ?? null,
      paymentStatus: order?.paymentStatus ?? null,
      // Paid (or refunded) means nothing is owed, so the tile and sheet show no amount.
      billPesewas:
        order && (order.paymentStatus === 'unpaid' || order.paymentStatus === 'part_paid')
          ? order.totalPesewas
          : null,
      waiterCallId: call?.id ?? null,
      waiterReason: call?.reason ?? null,
    };
  });
}
