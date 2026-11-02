export type ChargeStatus = 'succeeded' | 'failed' | 'abandoned' | 'pending';
export type Settlement = 'pending' | 'settled' | 'refunded';

export type Charge = {
  id: string;
  amountPesewas: number;
  status: ChargeStatus;
  settlement: Settlement;
};

export type RefundResult =
  | { ok: true; settlement: 'refunded'; refundedPesewas: number }
  | { ok: false; reason: 'not_succeeded' | 'already_refunded' | 'amount' };

/** Paystack sandbox only. A refund is the full succeeded amount, once. */
export function refundCharge(charge: Charge, amountPesewas: number): RefundResult {
  if (charge.settlement === 'refunded') return { ok: false, reason: 'already_refunded' };
  if (charge.status !== 'succeeded') return { ok: false, reason: 'not_succeeded' };
  if (!Number.isInteger(amountPesewas) || amountPesewas !== charge.amountPesewas) {
    return { ok: false, reason: 'amount' };
  }
  return { ok: true, settlement: 'refunded', refundedPesewas: amountPesewas };
}
