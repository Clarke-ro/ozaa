import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BellOff } from 'lucide-react-native';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { useNotesSeen, useNotifications } from '../../data/useNotifications';
import { EmptyCard, SectionLabel } from '../../kit';
import { NoteCard } from './NoteCard';

/**
 * What happened across the venue, in one column at every size: pinned alerts, then new since
 * the last visit, then earlier. One card per notification, newest first in each group.
 */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((s) => s.venueId) ?? '';
  const markSeen = useNotesSeen((s) => s.markSeen);
  const feed = useNotifications();
  const [since] = useState(feed.lastSeen);
  useEffect(() => () => markSeen(venueId, Date.now()), [markSeen, venueId]);

  const pinned = feed.notes.filter((n) => n.at === null);
  const fresh = feed.notes.filter((n) => n.at && (since === null || Date.parse(n.at) > since));
  const earlier = feed.notes.filter((n) => n.at && since !== null && Date.parse(n.at) <= since);
  const groups = [
    { key: 'pinned', title: t('ownerNotes.pinned'), items: pinned },
    { key: 'new', title: t('ownerNotes.new'), items: fresh },
    { key: 'earlier', title: t('ownerNotes.earlier'), items: earlier },
  ].filter((g) => g.items.length > 0);

  return (
    <OwnerPage title={t('ownerNotes.title')} subtitle={t('ownerNotes.lead')}>
      <DeskWait loading={feed.loading} error={feed.error} onRetry={feed.refetch}>
        {groups.length === 0 ? (
          <EmptyCard
            icon={BellOff}
            title={t('ownerNotes.empty')}
            description={t('ownerNotes.emptyBody')}
          />
        ) : (
          <View style={styles.stack}>
            {groups.map((group) => (
              <View key={group.key} style={styles.group}>
                <SectionLabel title={group.title} caps />
                <View style={styles.list}>
                  {group.items.map((note) => (
                    <NoteCard key={note.id} note={note} now={feed.now} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[6] },
  group: { gap: tokens.space[3] },
  list: { gap: tokens.space[2] },
});
