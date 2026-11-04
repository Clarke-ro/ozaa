import type { MenuItem, OrderLineInput } from '@/lib/api/types';
import { unitPrice } from '@/lib/dishRules';
import { addOnTotal, missingChoice } from '@/lib/dishLogic';

/** One line staff are building: a dish, how many, and the add-on options picked per group. */
export type DraftLine = {
  key: string;
  item: MenuItem;
  quantity: number;
  picks: Record<string, string[]>;
};

export type ManualOrderCheck =
  | { ok: true; lines: OrderLineInput[]; estimatePesewas: number }
  | { ok: false; reason: 'empty' }
  | { ok: false; reason: 'choice'; key: string; group: string };

/**
 * Turns what staff picked into the lines to send, plus an estimate for the button. The server
 * prices the order itself and its total wins; this only helps staff check before sending.
 */
export function manualOrder(draft: readonly DraftLine[]): ManualOrderCheck {
  const kept = draft.filter((line) => line.quantity > 0);
  if (kept.length === 0) return { ok: false, reason: 'empty' };
  for (const line of kept) {
    const missing = missingChoice(line.item.modifierGroups, line.picks);
    if (missing) return { ok: false, reason: 'choice', key: line.key, group: missing.name.en };
  }
  return {
    ok: true,
    lines: kept.map((line) => ({
      menuItemId: line.item.id,
      quantity: line.quantity,
      modifierOptionIds: Object.values(line.picks).flat(),
    })),
    estimatePesewas: kept.reduce(
      (sum, line) =>
        sum +
        (unitPrice(line.item) + addOnTotal(line.item.modifierGroups, line.picks)) * line.quantity,
      0,
    ),
  };
}
