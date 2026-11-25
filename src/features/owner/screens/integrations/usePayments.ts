import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { toMessageKey } from '@/lib/api/errors';
import type {
  FeePassing,
  ManualPayments,
  PaymentSettings,
  PaystackKeysInput,
} from '@/lib/api/types';
import { guestKeys } from '@/lib/queryKeys';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';

/**
 * How the venue takes payment, and every change Integrations can make to it. The list cards and
 * each integration's own page use the same hook, so they always agree. Guests' pay options
 * (payMethods on the venue) follow these settings, so each save refreshes the venue too.
 */
export function usePayments(venueId: string) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const key = ownerKeys.paymentSettings(venueId);
  const settings = useQuery({
    queryKey: key,
    queryFn: () => api.ownerGetPaymentSettings(venueId),
    enabled: Boolean(venueId),
  });
  const keep = (next: PaymentSettings) => {
    client.setQueryData(key, next);
    void client.invalidateQueries({ queryKey: ownerKeys.venue(venueId) });
    void client.invalidateQueries({ queryKey: guestKeys.venueAll() });
  };
  const failed = (error: unknown) => toast.error(t(toMessageKey(error)));
  const saved = () => toast.success(t('ownerKit.saved'));

  const connectPaystack = useMutation({
    mutationFn: (keys: PaystackKeysInput) => api.ownerConnectPaystack(venueId, keys),
    onSuccess: (next) => {
      keep(next);
      toast.success(t('ownerPay.connected'));
    },
    onError: failed,
  });
  const disconnectPaystack = useMutation({
    mutationFn: () => api.ownerDisconnectPaystack(venueId),
    onSuccess: keep,
    onError: failed,
  });
  const testPaystack = useMutation({
    mutationFn: () => api.ownerTestPaystack(venueId),
    onError: failed,
  });
  const setFees = useMutation({
    mutationFn: (body: FeePassing) => api.ownerSetFeePassing(venueId, body),
    onSuccess: (next) => {
      keep(next);
      saved();
    },
    onError: failed,
  });
  const setManual = useMutation({
    mutationFn: (body: ManualPayments) => api.ownerSetManualPayments(venueId, body),
    onSuccess: (next) => {
      keep(next);
      saved();
    },
    onError: failed,
  });

  return {
    settings,
    connectPaystack,
    disconnectPaystack,
    testPaystack,
    setFees,
    setManual,
  };
}
