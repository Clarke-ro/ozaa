import { randomUUID } from 'node:crypto';
import type { Db } from '../db/client.ts';
import { billQuotes } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import { pesewas } from '../shared/brand.ts';
import { passedFee } from '../shared/paystackFee.ts';
import { BillError, quoteBill, type BillRequest } from '../shared/quoteBill.ts';
import type { BillQuote, FeePassing, Order } from '../shared/types.ts';

// A quote holds for 10 minutes (the contract's BillQuote.expiresAt); a payment needs a live one.
export const QUOTE_TTL_MS = 10 * 60_000;

/**
 * What this guest pays now: their share (whole, equal or own dishes), the tip, and the part of
 * Paystack's fee the venue passes on. Saved, so POST /payments charges exactly this.
 */
export async function makeQuote(
  db: Db,
  input: { order: Order; request: BillRequest; feePassing: FeePassing | undefined; now: number },
): Promise<BillQuote> {
  const { order, request } = input;
  let share;
  try {
    share = quoteBill(
      {
        lines: order.lines.map((line) => ({ id: line.id, totalPesewas: pesewas(line.totalPesewas), paid: line.paid })),
        totalPesewas: pesewas(order.totalPesewas),
        paidPesewas: pesewas(order.paidPesewas),
      },
      request,
    );
  } catch (error) {
    if (error instanceof BillError) throw new Problem(400, error.code, 'Check how you want to split the bill.');
    throw error;
  }
  if (share.sharePesewas <= 0) throw new Problem(409, 'nothing_to_pay', 'This bill is already paid.');
  const fee = input.feePassing?.enabled ? passedFee(share.sharePesewas + share.tipPesewas, input.feePassing.percent) : 0;
  const id = `quo_${randomUUID().replaceAll('-', '')}`;
  const expiresAt = new Date(input.now + QUOTE_TTL_MS);
  await db.insert(billQuotes).values({
    id,
    orderId: order.id,
    mode: request.mode,
    lineIds: request.lineIds ?? [],
    sharePesewas: share.sharePesewas,
    tipPesewas: share.tipPesewas,
    feePesewas: fee,
    totalPesewas: share.totalPesewas + fee,
    remainingAfterPesewas: share.remainingAfterPesewas,
    expiresAt,
  });
  return {
    quoteId: id,
    orderId: order.id,
    sharePesewas: share.sharePesewas,
    tipPesewas: share.tipPesewas,
    feePesewas: fee,
    totalPesewas: share.totalPesewas + fee,
    remainingAfterPesewas: share.remainingAfterPesewas,
    expiresAt: expiresAt.toISOString(),
  };
}
