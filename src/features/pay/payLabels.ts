import type { Payment } from '@/lib/api/types';

/** The text key naming how a payment was made, for the receipt and the paid screen. */
export function payMethodLabel(payment: Pick<Payment, 'method' | 'provider'>): string {
  if (payment.method === 'card') return 'pay.card';
  // A MoMo charge sent straight to a phone knows its network; one paid on Paystack's page doesn't.
  if (payment.provider === 'mtn') return 'pay.mtn';
  if (payment.provider === 'vod') return 'pay.telecel';
  if (payment.provider === 'atl') return 'pay.at';
  return 'payment.momo';
}
