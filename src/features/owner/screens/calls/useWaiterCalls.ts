import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { WaiterCallUpdate } from '@/lib/api/client';
import { invalidateOwnerQueries } from '../../data/invalidateOwnerQueries';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';
import { POLL_MS } from '@/lib/polling';

/** The venue's waiter calls and bill requests, plus the "On my way" / "Done" update. */
export function useWaiterCalls(venueId: string) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const key = ownerKeys.calls(venueId);
  const calls = useQuery({
    queryKey: key,
    // The board has a Done column, so ask for every call of the last day, not only open ones.
    queryFn: () =>
      api.ownerListWaiterCalls(venueId, {
        open: false,
        since: new Date(Date.now() - 86_400_000).toISOString(),
      }),
    enabled: Boolean(venueId),
    refetchInterval: POLL_MS.owner,
  });
  // "On my way", "Done" or "Snooze 1 min", straight from a card on the board.
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & WaiterCallUpdate) =>
      api.ownerUpdateWaiterCall(id, body),
    onSuccess: (_saved, body) => {
      if (body.snoozeMinutes) toast.success(t('ownerCalls.snoozed'));
      invalidateOwnerQueries(client, [key, ownerKeys.floor(venueId), ownerKeys.dashboard(venueId)]);
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  return { calls, update };
}
