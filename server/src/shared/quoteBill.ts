// Generated from src/features/pay/quoteBill.ts by scripts/sync-server-shared.mjs. Do not edit here.
import { pesewas, type Pesewas } from './brand.ts';
import { percentOf } from './money.ts';

export type BillLine = { id: string; totalPesewas: Pesewas; paid: boolean };
export type TipChoice = { percent?: 0 | 5 | 10 | 15; customPesewas?: Pesewas };
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
  const tip =
    request.tip?.customPesewas !== undefined
      ? request.tip.customPesewas
      : percentOf(pesewas(share), request.tip?.percent ?? 0);
  return {
    sharePesewas: pesewas(share),
    tipPesewas: tip,
    totalPesewas: pesewas(share + tip),
    remainingAfterPesewas: pesewas(remaining - share),
  };
}
