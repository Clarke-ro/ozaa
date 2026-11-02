export type FloorStatus = 'free' | 'seated' | 'ordered' | 'waiting_to_pay' | 'needs_waiter';

export type FloorOrder = {
  id: string;
  number: number;
  tableCode: string | null;
  status: 'received' | 'preparing' | 'ready' | 'served' | 'cancelled';
  paymentStatus: 'unpaid' | 'part_paid' | 'paid' | 'refunded';
  totalPesewas: number;
  updatedAt: string;
};

export type FloorCall = {
  id: string;
  tableCode: string;
  reason: 'water' | 'bill' | 'cutlery' | 'order_more' | 'clean_table' | 'other';
  status: 'open' | 'acknowledged' | 'resolved';
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
  const matches = orders.filter((order) => order.tableCode === code && order.status !== 'cancelled');
  matches.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return matches[0] ?? null;
}

function fromOrder(order: FloorOrder | null, seated: boolean): FloorStatus {
  if (!order) return seated ? 'seated' : 'free';
  if (OPEN_KITCHEN.has(order.status)) return 'ordered';
  if (order.status === 'served' && (order.paymentStatus === 'unpaid' || order.paymentStatus === 'part_paid')) {
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
    const call = input.calls.find((item) => item.tableCode === table.code && item.status !== 'resolved') ?? null;
    const status: FloorStatus = call ? 'needs_waiter' : fromOrder(order, seated.has(table.code));
    return {
      ...table,
      status,
      orderId: order?.id ?? null,
      orderNumber: order?.number ?? null,
      orderStatus: order?.status ?? null,
      paymentStatus: order?.paymentStatus ?? null,
      billPesewas: order?.totalPesewas ?? null,
      waiterCallId: call?.id ?? null,
      waiterReason: call?.reason ?? null,
    };
  });
}
