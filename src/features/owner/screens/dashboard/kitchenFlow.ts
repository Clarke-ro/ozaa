import type { Order } from '@/lib/api/types';
import { orderTab, ticketAge, type TicketAge } from '../../desk/ops';

export type StageId = 'new' | 'cooking' | 'ready';

export type Stage = {
  id: StageId;
  count: number;
  /** How long the oldest ticket in this stage has waited, or null when the stage is empty. */
  oldestMinutes: number | null;
  /** ticketAge's tone for that oldest ticket, so the bar marks a late stage. */
  tone: TicketAge['tone'] | null;
};

const STAGES: readonly StageId[] = ['new', 'cooking', 'ready'];

/**
 * The kitchen at a glance: how many tickets sit in New, Cooking and Ready and how long the oldest
 * in each has waited, plus the open tickets oldest first (the guest who has waited longest is
 * the one to look at). Served and rejected tickets need no one, so they are left out.
 */
export function kitchenFlow<T extends Pick<Order, 'status' | 'createdAt'>>(
  orders: readonly T[],
  now: number,
): { stages: Stage[]; open: T[] } {
  const open = orders
    .filter((order) => (STAGES as readonly string[]).includes(orderTab(order.status)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const stages = STAGES.map((id): Stage => {
    const inStage = open.filter((order) => orderTab(order.status) === id);
    // `open` is sorted, so the first ticket in a stage is its oldest.
    const oldest = inStage[0];
    const age = oldest ? ticketAge(oldest.createdAt, now) : null;
    return {
      id,
      count: inStage.length,
      oldestMinutes: age ? age.minutes : null,
      tone: age ? age.tone : null,
    };
  });
  return { stages, open };
}
