import { useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Payment } from '@/lib/api/types';
import { guestKeys } from '@/lib/queryKeys';
import type { PayUiEvent } from './paymentMachine';

/**
 * Back from Paystack's card page: its callback lands on `/{slug}/pay?reference=…&trxref=…`.
 * Start checking that payment once (not again after Try again), and load it so the screen can
 * show what was being paid. Returns null when the guest didn't come back from a card page.
 */
export function useCardReturn(send: (event: PayUiEvent) => void): Payment | null {
  const params = useLocalSearchParams<{ reference?: string; trxref?: string }>();
  const reference = params.reference ?? params.trxref ?? null;
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!reference || handled.current === reference) return;
    handled.current = reference;
    send({ type: 'resume_check', reference });
  }, [reference, send]);

  const payment = useQuery({
    queryKey: guestKeys.payment(reference),
    queryFn: () => api.getPayment(reference ?? ''),
    enabled: Boolean(reference),
  });
  return payment.data ?? null;
}
