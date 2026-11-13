import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { Menu, MenuCategory, MenuItem } from '@/lib/api/types';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';
import { dishPositions, moveSection, sortSections } from './reorder';

/** Menu data and every change the menu builder can make. Each change refetches the menu when it lands. */
export function useMenuDesk(venueId: string) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const slug = venue.data?.slug ?? '';
  const key = ownerKeys.menu(slug);
  const menu = useQuery({
    queryKey: key,
    queryFn: () => api.getMenu(slug),
    enabled: Boolean(slug),
  });
  const refresh = () => client.invalidateQueries({ queryKey: key });
  const failed = () => toast.error(t('ownerKit.saveFailed'));

  // The switch flips at once; if the save fails it flips back and says so.
  const toggle = useMutation({
    mutationFn: (item: MenuItem) =>
      api.ownerUpdateItem(venueId, item.id, { available: !item.available }),
    onMutate: async (item) => {
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<Menu>(key);
      client.setQueryData<Menu>(key, (m) =>
        m
          ? {
              ...m,
              items: m.items.map((i) => (i.id === item.id ? { ...i, available: !i.available } : i)),
            }
          : m,
      );
      return { before };
    },
    onError: (_e, _item, context) => {
      if (context?.before) client.setQueryData(key, context.before);
      failed();
    },
    onSettled: refresh,
  });

  const setAll = useMutation({
    mutationFn: async ({ items, available }: { items: MenuItem[]; available: boolean }) => {
      for (const item of items) {
        if (item.available !== available)
          await api.ownerUpdateItem(venueId, item.id, { available });
      }
    },
    onSuccess: (_d, { available }) =>
      toast.success(available ? t('ownerMenu.allBack') : t('ownerMenu.allSoldOut')),
    onError: failed,
    onSettled: refresh,
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => api.ownerDeleteItem(venueId, id),
    onSuccess: () => toast.success(t('ownerMenu.deleted')),
    onError: failed,
    onSettled: refresh,
  });

  const removeSection = useMutation({
    mutationFn: (id: string) => api.ownerDeleteCategory(venueId, id),
    onSuccess: () => toast.success(t('ownerMenu.deleted')),
    onError: failed,
    onSettled: refresh,
  });

  // The eye on a section header: hide a whole section from guests, or show it again.
  const hideSection = useMutation({
    mutationFn: (section: MenuCategory) =>
      api.ownerUpdateCategory(venueId, section.id, {
        name: section.name,
        kind: section.kind,
        hidden: !section.hidden,
        schedule: section.schedule,
        position: section.position,
      }),
    onError: failed,
    onSettled: refresh,
  });

  const move = useMutation({
    mutationFn: async ({
      id,
      direction,
      kind,
    }: {
      id: string;
      direction: 'up' | 'down';
      kind: 'food' | 'drinks';
    }) => {
      const sections = (menu.data?.categories ?? []).filter((c) => c.kind === kind);
      for (const update of moveSection(sections, id, direction)) {
        const section = sections.find((c) => c.id === update.id);
        // Send the whole section so hidden and schedule survive even if the server replaces it.
        if (section) {
          const { name, kind: sectionKind, hidden, schedule } = section;
          await api.ownerUpdateCategory(venueId, section.id, {
            name,
            kind: sectionKind,
            hidden,
            schedule,
            position: update.position,
          });
        }
      }
    },
    onError: failed,
    onSettled: refresh,
  });

  // After a drag on Categories: save the new position of each section that moved. The whole
  // section is sent, as in `move`, so hidden and schedule survive a server that replaces it.
  const reorderSections = useMutation({
    mutationFn: async ({ kind, orderedIds }: { kind: 'food' | 'drinks'; orderedIds: string[] }) => {
      const sections = (menu.data?.categories ?? []).filter((c) => c.kind === kind);
      for (const update of dishPositions(sections, orderedIds)) {
        const section = sections.find((c) => c.id === update.id);
        if (section) {
          const { name, kind: sectionKind, hidden, schedule } = section;
          await api.ownerUpdateCategory(venueId, section.id, {
            name,
            kind: sectionKind,
            hidden,
            schedule,
            position: update.position,
          });
        }
      }
    },
    onSuccess: () => toast.success(t('ownerKit.saved')),
    onError: failed,
    onSettled: refresh,
  });

  // After a drag in one section: save the new position of each dish that moved.
  const reorderDishes = useMutation({
    mutationFn: async ({ dishes, orderedIds }: { dishes: MenuItem[]; orderedIds: string[] }) => {
      for (const update of dishPositions(dishes, orderedIds)) {
        await api.ownerUpdateItem(venueId, update.id, { position: update.position });
      }
    },
    onSuccess: () => toast.success(t('ownerKit.saved')),
    onError: failed,
    onSettled: refresh,
  });

  return {
    venue,
    menu,
    currency: venue.data?.currency ?? 'GHS',
    sectionsOf: (kind: 'food' | 'drinks') =>
      sortSections((menu.data?.categories ?? []).filter((c) => c.kind === kind)),
    refresh,
    toggle,
    setAll,
    removeItem,
    removeSection,
    hideSection,
    move,
    reorderSections,
    reorderDishes,
  };
}
