import { pesewas, type Pesewas } from '@/lib/brand';
import { percentOf } from '@/lib/money';

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

function unpaidTotal(lines: readonly BillLine[]): Pesewas {
  return pesewas(lines.reduce((sum, line) => sum + (line.paid ? 0 : line.totalPesewas), 0));
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

export function quoteBill(lines: readonly BillLine[], request: BillRequest): BillShare {
  const remaining = unpaidTotal(lines);
  let share = 0;
  if (request.mode === 'whole') share = remaining;
  else if (request.mode === 'equal') share = equalShare(remaining, request.parts ?? 0);
  else {
    const ids = request.lineIds ?? [];
    if (ids.length === 0) throw new BillError('no_lines');
    for (const id of ids) {
      const line = lines.find((item) => item.id === id);
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
