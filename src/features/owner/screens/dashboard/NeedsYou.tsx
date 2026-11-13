import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMarkRead, useOwnerFeed } from '../../data/useOwnerFeed';
import { tokens } from '@/theme/tokens';
import { FeedRow } from '../notifications/FeedRow';
import { Band } from './Band';
import { SectionHead } from './SectionHead';

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
    <Band>
      <SectionHead title={t('ownerNotes.pinned')} badge={String(waiting.length)} />
      <View style={styles.group}>
        {waiting.slice(0, MAX).map((item) => (
          <FeedRow
            key={item.id}
            item={item}
            now={now}
            compact
            onOpen={(row) => {
              if (row.readAt === null) markRead.mutate([row.id]);
            }}
          />
        ))}
      </View>
    </Band>
  );
}

const styles = StyleSheet.create({ group: { gap: tokens.owner.controls.listGap } });
