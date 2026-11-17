import type { OrderMove } from '@/features/orders';
import type { FloorTable, Order } from '@/lib/api/types';

export type DetailTable = Pick<FloorTable, 'status' | 'orderId' | 'waiterCallId'>;

/** The order's next kitchen step for this person, from nextOrderMove(), or null. */
export type NextStep = { move: OrderMove; status: Order['status'] };

export type ActionTone = 'primary' | 'secondary' | 'ghost';

export type DetailAction =
  | { id: 'acknowledge'; tone: ActionTone }
  | { id: 'resolve'; tone: ActionTone }
  | { id: 'markPaid'; tone: ActionTone }
  | { id: 'move'; tone: ActionTone; move: NextStep['move']; next: Order['status'] };

/**
 * The buttons in a table's sheet, most urgent first. Only the first urgent one is filled
 * (primary): a guest waiting on a call beats a bill, so "On my way" wins over Mark paid.
 * Everything else is outlined or plain, so the sheet never has two filled buttons.
 */
export function detailActions(
  table: DetailTable,
  opts: { hasBill: boolean; step: NextStep | null },
): DetailAction[] {
  const list: DetailAction[] = [];
  let primaryUsed = false;
  const urgent = (): ActionTone => {
    if (primaryUsed) return 'secondary';
    primaryUsed = true;
    return 'primary';
  };

  if (table.waiterCallId) {
    list.push({ id: 'acknowledge', tone: urgent() });
    list.push({ id: 'resolve', tone: 'ghost' });
  }
  if (opts.hasBill && table.orderId && table.status === 'waiting_to_pay') {
    list.push({ id: 'markPaid', tone: urgent() });
  }
  if (opts.step && opts.hasBill && table.orderId) {
    list.push({ id: 'move', tone: 'secondary', move: opts.step.move, next: opts.step.status });
  }
  return list;
}
