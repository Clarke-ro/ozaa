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
import { AddDashed, EmptyCard, SectionLabel, toast } from '../../kit';
import { LinkEditor } from './LinkEditor';
import { LinkRow } from './LinkRow';

const PLACEMENTS: CustomLink['placement'][] = ['button', 'banner', 'menu'];

/**
 * Extra buttons on the guest page in one column, grouped by where they show: a white card per
 * link, then the count and a dashed "Add a link" box at the end. Switch one off to hide it
 * without deleting it.
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

  const items = [...(links.data?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <OwnerPage title={t('owner.links')} subtitle={t('ownerLinks.lead')}>
      <DeskWait
        loading={links.isLoading}
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
                  <SectionLabel title={t(`ownerLinks.placement.${placement}`)} caps />
                  <View style={styles.list}>
                    {group.map((link) => (
                      <LinkRow
                        key={link.id}
                        link={link}
                        onEdit={() => setEditing(link)}
                        onToggle={() => toggle.mutate(link)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
            <View style={styles.group}>
              <Text variant="caption" style={[styles.count, { color: theme.muted }]}>
                {t('ownerLinks.count', { count: items.length })}
              </Text>
              <AddDashed label={t('ownerLinks.add')} onPress={() => setEditing(null)} />
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
  group: { gap: tokens.space[3] },
  list: { gap: tokens.space[2] },
  count: { alignSelf: 'flex-end' },
});
