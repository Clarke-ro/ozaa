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
 * What happened across the venue: pinned alerts, then new since the last visit, then earlier.
 * Each line opens the screen where it gets handled. Leaving the screen marks everything seen.
 */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((s) => s.venueId) ?? '';
  const markSeen = useNotesSeen((s) => s.markSeen);
  const feed = useNotifications();
  // Fixed while the screen is open, so "New" doesn't empty itself under the owner's eyes.
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
    <OwnerPage title={t('ownerNotes.title')}>
      <DeskWait loading={feed.loading} error={feed.error} onRetry={feed.refetch}>
        {groups.length === 0 ? (
          <EmptyCard
            icon={BellOff}
            title={t('ownerNotes.empty')}
            description={t('ownerNotes.emptyBody')}
          />
        ) : (
          groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <SectionLabel title={group.title} caps />
              <View style={styles.list}>
                {group.items.map((note) => (
                  <NoteCard key={note.id} note={note} now={feed.now} />
                ))}
              </View>
            </View>
          ))
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space[2] },
  list: { gap: tokens.space[2] },
});
