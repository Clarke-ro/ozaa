import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { PayUiEvent, PayUiState } from './paymentMachine';
import { eventFor, secondsLeft } from './paymentWatch';
import { POLL_MS } from '@/lib/polling';

const TICK_MS = 1000;

/**
 * Keeps the screen in step with the server for one MoMo payment:
 * - while waiting, reads the payment every few seconds and ticks the countdown;
 * - when the countdown ends, asks the server to verify a few times before giving up.
 * Returns the seconds left to approve.
 */
export function usePaymentWatch(
  state: PayUiState,
  send: (event: PayUiEvent) => void,
  fallback: string,
): number {
  const waiting = state.kind === 'awaiting_approval';
  const checking = state.kind === 'checking';
  const reference = waiting || checking ? state.reference : null;
  const approveBy = waiting ? state.approveBy : Number.NaN;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!waiting) return;
    // Read the clock straight away too, or the first second shows time from before Pay was tapped.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [waiting]);
  const left = secondsLeft(approveBy, now);

  useEffect(() => {
    if (waiting && left === 0) send({ type: 'countdown_done' });
  }, [waiting, left, send]);

  useEffect(() => {
    if (!reference) return;
    let stopped = false;
    let checks = 0;
    const ask = async () => {
      try {
        const payment = checking
          ? await api.verifyPayment(reference)
          : await api.getPayment(reference);
        if (checking) checks += 1;
        const event = eventFor(payment, checking ? 'checking' : 'waiting', checks, fallback);
        if (event && !stopped) send(event);
      } catch {
        // Offline or a blip: ask again on the next tick. Nothing changes on screen.
      }
    };
    void ask();
    const id = setInterval(() => void ask(), POLL_MS.guestWaiting);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [reference, checking, send, fallback]);

  return left;
}
