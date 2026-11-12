import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { StaffPrefs, StaffProfilePatch } from '@/lib/api/types';
import { ownerKeys } from '../../data/keys';
import { useMe } from '../../data/useMe';
import { toast } from '../../kit';

export const DEFAULT_PREFS: StaffPrefs = {
  language: 'en',
  appearance: 'system',
  soundForNewOrders: true,
  notify: { order: true, call: true, bill: true, guest_note: true, review: true },
};

/** The signed-in person and a save that refreshes their name everywhere (sidebar, settings). */
export function useProfile() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const me = useMe();
  const save = useMutation({
    mutationFn: (body: StaffProfilePatch) => api.updateMyProfile(body),
    onSuccess: (user) => {
      client.setQueryData(ownerKeys.me(), user);
      // Notification kinds changed what the feed shows this person.
      void client.invalidateQueries({ queryKey: ['owner-notifications'] });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const prefs = me.data?.prefs ?? DEFAULT_PREFS;
  return { me, save, prefs };
}
