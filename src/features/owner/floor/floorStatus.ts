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
 * With payments off nothing in the app marks a bill paid, so the bill request is the signal:
 * an open or acknowledged bill request means the table is waiting for its bill, and staff
 * resolving it ("Bill settled") closes every order placed before the guest asked.
 */
function withoutPayments(order: FloorOrder | null, calls: FloorCall[], seated: boolean): FloorStatus {
  if (!order) return seated ? 'seated' : 'free';
  if (OPEN_KITCHEN.has(order.status)) return 'ordered';
  const settled = calls.some(
    (call) => call.reason === 'bill' && call.status === 'resolved' && call.createdAt >= order.createdAt,
  );
  if (settled) return seated ? 'seated' : 'free';
  return 'seated';
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
  /** PAYMENTS_ENABLED. Off: "waiting to pay" comes from the guest's bill request, not payment status. */
  payments: boolean;
}): FloorTableView[] {
  const seated = new Set(input.seatedCodes);
  return input.tables.map((table) => {
    const order = latestOrder(input.orders, table.code);
    const tableCalls = input.calls.filter((item) => item.tableCode === table.code);
    const call = tableCalls.find((item) => item.status !== 'resolved') ?? null;
    let status: FloorStatus;
    if (input.payments) {
      status = call ? 'needs_waiter' : fromOrder(order, seated.has(table.code));
    } else if (call) {
      status = call.reason === 'bill' ? 'waiting_to_pay' : 'needs_waiter';
    } else {
      status = withoutPayments(order, tableCalls, seated.has(table.code));
    }
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
