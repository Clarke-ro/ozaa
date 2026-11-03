import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { VenueSettingsPatch } from '@/lib/api/types';
import { toast } from '../kit';
import { ownerKeys } from './keys';

/** Saves venue settings with the usual toast and refresh. `onDone` runs after a successful save. */
export function useSaveVenue(venueId: string, onDone?: () => void) {
  const { t } = useTranslation();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: VenueSettingsPatch) => api.ownerUpdateVenue(venueId, patch),
    onSuccess: () => {
      toast.success(t('ownerKit.saved'));
      onDone?.();
      return client.invalidateQueries({ queryKey: ownerKeys.venue(venueId) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
}
