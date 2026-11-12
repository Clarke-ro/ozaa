import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMarkRead, useOwnerFeed } from '../../data/useOwnerFeed';
import { SectionLabel } from '../../kit';
import { tokens } from '@/theme/tokens';
import { FeedRow } from '../notifications/FeedRow';

const MAX = 5;

/**
 * What still needs someone right now, as its own cards: open calls, new orders, bills, unhappy
 * notes. The same feed as Notifications, so the two never disagree. Hidden when nothing waits.
 */
export function NeedsYou() {
  const { t } = useTranslation();
  const feed = useOwnerFeed();
  const markRead = useMarkRead();
  const waiting = (feed.data?.items ?? []).filter((item) => item.needsAction);
  if (waiting.length === 0) return null;
  const now = feed.dataUpdatedAt;
  return (
    <View style={styles.group}>
      <SectionLabel title={t('ownerNotes.pinned')} />
      {waiting.slice(0, MAX).map((item) => (
        <FeedRow
          key={item.id}
          item={item}
          now={now}
          onOpen={(row) => {
            if (row.readAt === null) markRead.mutate([row.id]);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ group: { gap: tokens.space[2] } });
