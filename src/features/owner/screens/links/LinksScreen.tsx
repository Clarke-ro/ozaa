import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { CustomLink } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { EmptyCard, Section, Toggle, toast } from '../../kit';
import { linkIcon } from './icons';
import { LinkEditor } from './LinkEditor';

const PLACEMENTS: CustomLink['placement'][] = ['button', 'banner', 'menu'];

function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Extra buttons on the guest page, grouped by where they show. Switch one off without deleting it. */
export function LinksScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const key = ['owner-links', venueId];
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
    <OwnerPage
      title={t('owner.links')}
      action={
        <Button
          label={t('ownerLinks.addShort')}
          tone="secondary"
          size="md"
          onPress={() => setEditing(null)}
        />
      }
    >
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
          PLACEMENTS.map((placement) => {
            const group = items.filter((l) => l.placement === placement);
            if (!group.length) return null;
            return (
              <Section key={placement} title={t(`ownerLinks.placement.${placement}`)}>
                {group.map((link) => {
                  const Icon = linkIcon(link.icon);
                  return (
                    <View key={link.id} style={styles.row}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('ownerLinks.editA11y', { title: link.title })}
                        onPress={() => setEditing(link)}
                        style={({ pressed }) => [styles.main, pressed && { opacity: 0.6 }]}
                      >
                        <Icon size={20} color={link.enabled ? theme.ink : theme.meta} />
                        <View style={styles.flex}>
                          <Text
                            variant="body-strong"
                            style={!link.enabled && { color: theme.muted }}
                            numberOfLines={1}
                          >
                            {link.title}
                          </Text>
                          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
                            {host(link.url)} ·{' '}
                            {t('ownerLinks.clicks', {
                              count: link.clicks,
                              n: link.clicks.toLocaleString(i18n.language),
                            })}
                          </Text>
                        </View>
                      </Pressable>
                      <Toggle
                        value={link.enabled}
                        onChange={() => toggle.mutate(link)}
                        label={t('ownerLinks.showA11y', { title: link.title })}
                      />
                    </View>
                  );
                })}
              </Section>
            );
          })
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingRight: tokens.space[4],
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 60,
    paddingLeft: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  flex: { flex: 1 },
});
