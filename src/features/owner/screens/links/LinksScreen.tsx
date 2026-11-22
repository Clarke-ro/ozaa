import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { CustomLink } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { AddDashed, EmptyCard, toast } from '../../kit';
import { Button } from '@/ui/Button';
import { LinkEditor } from './LinkEditor';
import { LinkRow } from './LinkRow';
import { reorderLinks } from './moveLink';
import { DragList } from '../../kit/DragList';

// Canvas link rows are 76 px tall; every row the same height lets a drag map to a position.
const ROW = 76;

const PLACEMENTS: CustomLink['placement'][] = ['button', 'banner', 'menu'];

/**
 * Extra buttons on the guest page (canvas), grouped by where they show: one row per link that
 * you drag by its grip to reorder, then a dashed "Add a link". Switch one off to hide it.
 */
export function LinksScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const key = ownerKeys.links(venueId);
  const links = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListCustomLinks(venueId),
    enabled: Boolean(venueId),
  });
  const [editing, setEditing] = useState<CustomLink | null | undefined>(undefined);

  const toggle = useMutation({
    mutationFn: (link: CustomLink) =>
      api.ownerUpdateCustomLink(venueId, link.id, {
        title: link.title,
        url: link.url,
        icon: link.icon,
        placement: link.placement,
        startDate: link.startDate,
        endDate: link.endDate,
        enabled: !link.enabled,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: key }),
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  // Saves the new order of every link that moved; the guest page shows them in this order.
  const move = useMutation({
    mutationFn: async (changes: { id: string; sortOrder: number }[]) => {
      for (const change of changes) {
        const link = links.data?.items.find((item) => item.id === change.id);
        if (link)
          await api.ownerUpdateCustomLink(venueId, link.id, {
            title: link.title,
            url: link.url,
            sortOrder: change.sortOrder,
          });
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const items = [...(links.data?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <OwnerPage
      title={t('owner.links')}
      subtitle={t('ownerLinks.lead')}
      action={<Button label={t('ownerLinks.add')} onPress={() => setEditing(null)} />}
    >
      <DeskWait
        loading={links.isPending}
        error={links.isError}
        onRetry={() => void links.refetch()}
      >
        {items.length === 0 ? (
          <EmptyCard
            icon={Link}
            title={t('ownerLinks.empty')}
            description={t('ownerLinks.emptyBody')}
            actionLabel={t('ownerLinks.add')}
            onAction={() => setEditing(null)}
          />
        ) : (
          <View style={styles.stack}>
            {PLACEMENTS.map((placement) => {
              const group = items.filter((l) => l.placement === placement);
              if (!group.length) return null;
              return (
                <View key={placement} style={styles.group}>
                  <Text variant="title" accessibilityRole="header">
                    {t(`ownerLinks.placementTitle.${placement}`)}
                  </Text>
                  <DragList
                    items={group.map((link) => ({ key: link.id, label: link.title, link }))}
                    rowHeight={ROW}
                    gripSide="start"
                    onOrder={(ids) => move.mutate(reorderLinks(group, ids))}
                    renderRow={({ link }) => (
                      <LinkRow
                        link={link}
                        onEdit={() => setEditing(link)}
                        onToggle={() => toggle.mutate(link)}
                      />
                    )}
                  />
                </View>
              );
            })}
            <View style={styles.group}>
              <AddDashed label={t('ownerLinks.add')} onPress={() => setEditing(null)} />
              <Text style={[styles.note, { color: theme.meta }]}>{t('ownerLinks.footnote')}</Text>
            </View>
          </View>
        )}
      </DeskWait>
      {editing !== undefined ? (
        <LinkEditor
          key={editing?.id ?? 'new'}
          venueId={venueId}
          link={editing}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[6] },
  group: { gap: tokens.space[4] },
  note: { fontSize: 14, lineHeight: 20 },
});
