import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BellOff } from 'lucide-react-native';
import type { OwnerNotification, OwnerNotificationKind } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { FilterChips } from '@/ui/FilterChips';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { useMarkRead, useOwnerFeed } from '../../data/useOwnerFeed';
import { EmptyCard, SectionLabel } from '../../kit';
import { FeedRow } from './FeedRow';

type Filter = 'all' | OwnerNotificationKind;
const KINDS: readonly OwnerNotificationKind[] = ['order', 'call', 'bill', 'guest_note', 'review'];

/**
 * Everything that happened today, newest first: what still needs someone on top ("Needs you"),
 * then the rest. Filter chips carry unread counts. Read state is kept per person on the server.
 */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const feed = useOwnerFeed();
  const markRead = useMarkRead();
  const [filter, setFilter] = useState<Filter>('all');
  const items = feed.data?.items ?? [];
  const counts = feed.data?.countsByKind ?? {};
  // Only show a chip for kinds this person can get, so a waiter isn't offered "Guest notes".
  const kinds = KINDS.filter((kind) => items.some((item) => item.kind === kind));
  const shown = filter === 'all' ? items : items.filter((item) => item.kind === filter);
  const needs = shown.filter((item) => item.needsAction);
  const rest = shown.filter((item) => !item.needsAction);
  const now = feed.dataUpdatedAt;
  const open = (item: OwnerNotification) => {
    if (item.readAt === null) markRead.mutate([item.id]);
  };

  return (
    <OwnerPage
      title={t('ownerNotes.title')}
      subtitle={t('ownerNotes.lead')}
      action={
        (feed.data?.unreadCount ?? 0) > 0 ? (
          <Button
            label={t('ownerNotes.markAll')}
            tone="secondary"
            size="md"
            loading={markRead.isPending}
            onPress={() => markRead.mutate(undefined)}
          />
        ) : undefined
      }
    >
      <DeskWait loading={feed.isLoading} error={feed.isError} onRetry={() => void feed.refetch()}>
        {items.length === 0 ? (
          <EmptyCard
            icon={BellOff}
            title={t('ownerNotes.empty')}
            description={t('ownerNotes.emptyBody')}
          />
        ) : (
          <View style={styles.stack}>
            <FilterChips<Filter>
              label={t('ownerNotes.filter')}
              value={filter}
              onChange={setFilter}
              gutter={0}
              items={[
                { id: 'all', label: t('ownerNotes.all'), count: feed.data?.unreadCount },
                ...kinds.map((kind) => ({
                  id: kind,
                  label: t(`ownerNotes.kinds.${kind}`),
                  count: counts[kind] ?? 0,
                })),
              ]}
            />
            {needs.length > 0 ? (
              <View style={styles.group}>
                <SectionLabel title={t('ownerNotes.pinned')} />
                {needs.map((item) => (
                  <FeedRow key={item.id} item={item} now={now} onOpen={open} />
                ))}
              </View>
            ) : null}
            {rest.length > 0 ? (
              <View style={styles.group}>
                <SectionLabel title={t('ownerNotes.today')} />
                {rest.map((item) => (
                  <FeedRow key={item.id} item={item} now={now} onOpen={open} />
                ))}
              </View>
            ) : null}
            {shown.length === 0 ? (
              <EmptyCard
                icon={BellOff}
                title={t('ownerNotes.emptyFilter')}
                description={t('ownerNotes.emptyFilterBody')}
              />
            ) : null}
          </View>
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[6] },
  group: { gap: tokens.space[2] },
});
