// Generated from src/features/pay/quoteBill.ts by scripts/sync-server-shared.mjs. Do not edit here.
import { isPesewas, pesewas, type Pesewas } from './brand.ts';
import { percentOf } from './money.ts';

export type BillLine = { id: string; totalPesewas: Pesewas; paid: boolean };
export type TipChoice = { percent?: 0 | 5 | 10 | 15; customPesewas?: Pesewas };

/** GHS 10,000. A custom tip has no share to scale with, and the quote is a 32-bit integer column. */
export const MAX_CUSTOM_TIP_PESEWAS = 1_000_000;
const SQL_INT_MAX = 2_147_483_647;
export type BillMode = 'whole' | 'equal' | 'items';

export type BillRequest = {
  mode: BillMode;
  parts?: number;
  lineIds?: string[];
  tip?: TipChoice;
};

export type BillShare = {
  sharePesewas: Pesewas;
  tipPesewas: Pesewas;
  totalPesewas: Pesewas;
  remainingAfterPesewas: Pesewas;
};

export class BillError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/**
 * The bill as the order reports it. `totalPesewas` is the server's total (dishes plus any
 * delivery fee) and `paidPesewas` is everything already paid, by any split. What is left is
 * worked out from these two, not from the lines: an equal share pays money, not dishes, so it
 * marks no line paid.
 */
export type Bill = {
  lines: readonly BillLine[];
  totalPesewas: Pesewas;
  paidPesewas: Pesewas;
};

function outstanding(bill: Bill): number {
  return Math.max(0, bill.totalPesewas - bill.paidPesewas);
}

/**
 * Equal split gives leftover pesewas to the earlier payers.
 * `parts` is how many people still share the unpaid amount, including this guest.
 * The share is the ceiling, so the first payers carry the remainder.
 */
function equalShare(remaining: number, parts: number): number {
  if (!Number.isInteger(parts) || parts < 2 || parts > 20) throw new BillError('bad_parts');
  return Math.ceil(remaining / parts);
}

export function quoteBill(bill: Bill, request: BillRequest): BillShare {
  const remaining = outstanding(bill);
  let share = 0;
  if (request.mode === 'whole') share = remaining;
  else if (request.mode === 'equal') share = equalShare(remaining, request.parts ?? 0);
  else {
    // A dish picked twice is still one dish.
    const ids = [...new Set(request.lineIds ?? [])];
    if (ids.length === 0) throw new BillError('no_lines');
    for (const id of ids) {
      const line = bill.lines.find((item) => item.id === id);
      if (!line || line.paid) throw new BillError('line_unavailable');
      share += line.totalPesewas;
    }
  }
  if (share > remaining) share = remaining;
  const custom = request.tip?.customPesewas;
  const tip =
    custom !== undefined ? custom : percentOf(pesewas(share), request.tip?.percent ?? 0);
  // Percent tips are already a fraction of this share. A typed amount is not, so it stops at
  // GHS 10,000, and either kind is refused when the quote would not fit the integer column.
  if (custom !== undefined && (!Number.isInteger(custom) || custom < 0 || custom > MAX_CUSTOM_TIP_PESEWAS)) {
    throw new BillError('tip_too_high');
  }
  // pesewas() refuses anything above GHS 1,000,000, and the column refuses anything above
  // a signed 32-bit integer. Either one used to come back as a 500.
  if (!isPesewas(tip) || !isPesewas(share + tip) || share + tip > SQL_INT_MAX) throw new BillError('tip_too_high');
  return {
    sharePesewas: pesewas(share),
    tipPesewas: pesewas(tip),
    totalPesewas: pesewas(share + tip),
    remainingAfterPesewas: pesewas(remaining - share),
  };
}
