import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react-native';
import type { OwnerDashboard } from '@/lib/api/types';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { LocationSwitcher } from '../../chrome/LocationSwitcher';
import { useNotifications } from '../../data/useNotifications';
import { SalesSummary } from './SalesSummary';

/** The top of Today in the app's own theme: location, calls, the period, and, when payments are on, sales. */
export function OverviewPanel({ dashboard }: { dashboard: OwnerDashboard }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { unseen } = useNotifications();
  const insets = useSafeAreaInsets();
  const firstName = useOwnerSession((state) => state.firstName);
  const date = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View
      style={[
        styles.panel,
        {
          paddingTop: insets.top + tokens.space[2],
          backgroundColor: theme.wash,
          borderColor: theme.line,
        },
      ]}
    >
      <View style={styles.top}>
        <LocationSwitcher variant="chip" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ownerNotes.bellA11y', { count: unseen })}
          onPress={() => router.push('/owner/notifications')}
          style={({ pressed }) => [
            styles.bell,
            { backgroundColor: pressed ? theme.line : theme.surface },
          ]}
        >
          <Bell size={20} color={theme.text} />
          {unseen > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.fill }]}>
              <Text variant="caption" style={[styles.badgeText, { color: theme.onFill }]}>
                {unseen > 99 ? '99+' : unseen}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View>
        <Text variant="display-m" accessibilityRole="header">
          {firstName ? t('ownerDash.greeting', { name: firstName }) : t('owner.dashboard')}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {date}
        </Text>
      </View>

      {PAYMENTS_ENABLED ? <SalesSummary dashboard={dashboard} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[6],
    gap: tokens.space[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: 'Inter_600', fontSize: 11, lineHeight: 14 },
});
