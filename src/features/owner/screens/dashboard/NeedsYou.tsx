import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CircleCheck } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useNotifications } from '../../data/useNotifications';
import { needsYou } from '../../desk/notifications';
import { SectionLabel } from '../../kit';
import { NoteCard } from '../notifications/NoteCard';

// Today shows the most urgent few; the rest are one tap away on Notifications.
const SHOWN = 5;

/**
 * Everything urgent, one card each: open waiter calls, late orders, failed payments, unhappy
 * notes, sold-out dishes, tables waiting to pay, the payout account. It reads the same feed as
 * Notifications, so any new urgent kind appears here without touching this file.
 */
export function NeedsYou() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const feed = useNotifications();
  const urgent = needsYou(feed.notes);
  const shown = urgent.slice(0, SHOWN);

  return (
    <View style={styles.wrap}>
      <SectionLabel
        title={t('ownerDash.needsYou')}
        caps
        action={urgent.length > SHOWN ? t('ownerDash.seeAll') : undefined}
        onAction={urgent.length > SHOWN ? () => router.push('/owner/notifications') : undefined}
      />
      {shown.length === 0 ? (
        <View style={[styles.clear, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <CircleCheck size={20} color={theme.success} />
          <Text variant="body" style={{ color: theme.muted }}>
            {feed.loading ? ' ' : t('ownerNotes.allClear')}
          </Text>
        </View>
      ) : (
        shown.map((note) => <NoteCard key={note.id} note={note} now={feed.now} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 56,
    paddingHorizontal: tokens.space[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
});
