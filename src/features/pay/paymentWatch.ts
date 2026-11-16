import type { Payment } from '@/lib/api/types';
import type { PayUiEvent } from './paymentMachine';
import { POLL_MS } from '@/lib/polling';

/**
 * How many times we ask the server to verify after the countdown ends (one every few seconds)
 * before saying nobody approved. Paystack can report an approval a little late, and a late
 * approval must never be shown as a failure.
 */
export const CHECKS = 5;

/** Whole seconds until `approveBy`, rounded up so 0:00 only shows when time is really up. */
export function secondsLeft(approveBy: number, now: number): number {
  if (!Number.isFinite(approveBy)) return 0;
  return Math.max(0, Math.ceil((approveBy - now) / 1000));
}

/** 180 → "3:00", 65 → "1:05". */
export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * What a payment status read from the server means for the guest's screen. Only `succeeded`
 * becomes paid. `phase` is where the guest is: still counting down, or checking after it.
 */
export function eventFor(
  payment: Pick<Payment, 'reference' | 'status' | 'failureReason'>,
  phase: 'waiting' | 'checking',
  checks: number,
  fallback: string,
): PayUiEvent | null {
  switch (payment.status) {
    case 'succeeded':
      return { type: 'server_succeeded', reference: payment.reference };
    case 'failed':
      return { type: 'server_failed', message: payment.failureReason ?? fallback };
    case 'abandoned':
      // Our clock can run behind the server's: finish the countdown, then let verify decide.
      return phase === 'waiting' ? { type: 'countdown_done' } : { type: 'verify_still_open' };
    default:
      return phase === 'checking' && checks >= CHECKS ? { type: 'verify_still_open' } : null;
  }
}

/** The first few checks come quickly, while the guest is most likely entering their PIN. */
const QUICK_CHECKS = 3;

/**
 * How long to wait before the next payment check (BUILD.md section 11: every 3 s, backing off to
 * 10 s). Most approvals land within the first few seconds; after that, slower checks save the
 * guest's data and battery, and the server's webhook still settles the payment either way.
 */
export function pollDelay(attempt: number): number {
  const fast = POLL_MS.guestWaiting;
  if (attempt < QUICK_CHECKS) return fast;
  return Math.min(10_000, Math.round(fast * 1.3 ** (attempt - QUICK_CHECKS + 1)));
}
