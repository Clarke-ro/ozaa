import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { StaffRole } from '@/lib/api/types';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';

/** What the owner can do to one staff member: role and tables, end shift, reset PIN, remove. */
export function useStaffActions(venueId: string, staffId: string) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ownerKeys.staff(venueId) });
  const failed = () => toast.error(t('ownerKit.saveFailed'));
  const update = useMutation({
    mutationFn: (body: { role?: Exclude<StaffRole, 'owner'>; tableCodes?: string[] }) =>
      api.ownerUpdateStaff(venueId, staffId, body),
    onSuccess: () => void refresh(),
    onError: failed,
  });
  const endShift = useMutation({
    mutationFn: () => api.ownerSignOutStaff(venueId, staffId),
    onSuccess: () => {
      toast.success(t('ownerStaff.shiftEnded'));
      void refresh();
    },
    onError: failed,
  });
  const resetPin = useMutation({
    mutationFn: () => api.ownerResetStaffPin(venueId, staffId),
    onSuccess: () => {
      toast.success(t('ownerStaff.pinReset'));
      void refresh();
    },
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: () => api.ownerRevokeStaff(venueId, staffId),
    onSuccess: () => {
      toast.success(t('ownerStaff.removed'));
      void refresh();
    },
    onError: failed,
  });
  return { update, endShift, resetPin, remove };
}
