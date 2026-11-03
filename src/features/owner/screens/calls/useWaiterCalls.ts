import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';

// Calls are urgent, so check every few seconds while a screen that shows them is open.
const LIVE_MS = 5000;

/** The venue's waiter calls and bill requests, plus the "On my way" / "Done" update. */
export function useWaiterCalls(venueId: string) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const key = ownerKeys.calls(venueId);
  const calls = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListWaiterCalls(venueId),
    enabled: Boolean(venueId),
    refetchInterval: LIVE_MS,
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'acknowledged' | 'resolved' }) =>
      api.ownerUpdateWaiterCall(id, { status }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({ queryKey: ownerKeys.floor(venueId) });
      void client.invalidateQueries({ queryKey: ownerKeys.dashboard(venueId) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  return { calls, update };
}
