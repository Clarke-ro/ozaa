import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { ModifierGroup, ModifierGroupInput } from '@/lib/api/types';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';

/** What the server takes for a group: no group id, and option ids only to keep an option. */
function inputOf(group: ModifierGroup): ModifierGroupInput {
  return {
    name: { ...group.name, en: group.name.en.trim() },
    min: group.min,
    max: group.max,
    options: group.options.map((o) => ({ ...o, name: { ...o.name, en: o.name.en.trim() } })),
  };
}

/** Saving and deleting add-on library groups. Each change refetches the menu. */
export function useAddOnLibrary(venueId: string, slug: string) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ownerKeys.menu(slug) });

  const save = useMutation({
    mutationFn: ({ group, isNew }: { group: ModifierGroup; isNew: boolean }) =>
      isNew
        ? api.ownerCreateModifierGroup(venueId, inputOf(group))
        : api.ownerUpdateModifierGroup(venueId, group.id, inputOf(group)),
    onSuccess: () => toast.success(t('ownerKit.saved')),
    onError: () => toast.error(t('ownerKit.saveFailed')),
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (groupId: string) => api.ownerDeleteModifierGroup(venueId, groupId),
    onSuccess: () => toast.success(t('ownerMenu.deleted')),
    onError: () => toast.error(t('ownerKit.saveFailed')),
    onSettled: refresh,
  });

  return { save, remove, inputOf };
}
