/** Our payment statuses (api/openapi.yaml PaymentStatus). */
export type PaymentStatus = 'pending' | 'pay_offline' | 'open_url' | 'succeeded' | 'failed' | 'abandoned';

/** What Paystack's verify or webhook says about one transaction. */
export type PaystackTransaction = {
  status: string;
  amount: number;
  currency: string;
  gateway_response?: string;
};

/**
 * Turns Paystack's word into ours. Only Paystack "success" with the amount and currency we asked
 * for becomes `succeeded` (BUILD.md section 9: only succeeded puts money on the order). A success
 * for a different amount is treated as failed and logged, never as paid.
 */
export function fromPaystack(
  tx: PaystackTransaction,
  expected: { amountPesewas: number; currency: 'GHS' },
  current: PaymentStatus,
): { status: PaymentStatus; failureReason?: string } {
  switch (tx.status) {
    case 'success':
      return tx.amount === expected.amountPesewas && tx.currency === expected.currency
        ? { status: 'succeeded' }
        : { status: 'failed', failureReason: 'amount_mismatch' };
    case 'failed':
    case 'reversed':
      return { status: 'failed', failureReason: tx.gateway_response ?? 'failed' };
    case 'abandoned':
      return { status: 'abandoned' };
    default:
      // ongoing, pending, processing, queued, send_otp, pay_offline: not decided yet.
      return { status: current };
  }
}
