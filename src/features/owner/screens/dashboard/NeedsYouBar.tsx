import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CircleCheck } from 'lucide-react-native';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { canOpen } from '../../chrome/nav';
import { SkeletonBlock } from '../../chrome/OwnerPage';
import { useNotifications } from '../../data/useNotifications';
import { needsYou } from '../../desk/notifications';
import { AttentionRow } from './AttentionRow';
import { Band } from './Band';
import { SectionHead } from './SectionHead';

// Today shows the most urgent few, so the kitchen stays near the top; the rest are one tap away.
const SHOWN = 4;
const BAR = tokens.touchTarget + tokens.space[2];

/**
 * Everything urgent, one alert bar each: open waiter calls, late orders, failed payments,
 * unhappy notes, sold-out dishes, tables waiting to pay, the payout account. It reads the same
 * feed as Notifications, so a new urgent kind shows here with no change to this file. When
 * nothing is urgent it is one calm line.
 */
export function NeedsYouBar() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const feed = useNotifications();
  const urgent = needsYou(feed.notes);
  const more = urgent.length > SHOWN && canOpen(role, '/owner/notifications');

  return (
    <Band>
      <SectionHead
        title={t('ownerDash.needsYou')}
        meta={urgent.length ? t('ownerDash.waitingCount', { count: urgent.length }) : undefined}
        action={more ? t('ownerDash.seeAll') : undefined}
        onAction={more ? () => router.push('/owner/notifications') : undefined}
      />
      {feed.loading ? (
        // Labelled like DeskWait's skeleton, so screenshot tests wait for this section too.
        <View accessibilityRole="progressbar" accessibilityLabel={t('errors.loading')}>
          <SkeletonBlock height={BAR * 2} />
        </View>
      ) : urgent.length === 0 ? (
        <View style={styles.clear}>
          <CircleCheck size={20} color={theme.success} />
          <Text variant="body" style={{ color: theme.muted }}>
            {t('ownerNotes.allClear')}
          </Text>
        </View>
      ) : (
        <View style={styles.bars}>
          {urgent.slice(0, SHOWN).map((note) => (
            <AttentionRow key={note.id} note={note} now={feed.now} />
          ))}
        </View>
      )}
    </Band>
  );
}

const styles = StyleSheet.create({
  bars: { gap: tokens.space[2] },
  clear: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
});
