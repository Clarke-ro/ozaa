import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Inbox,
  QrCode,
  ScanLine,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import type { OwnerDashboard } from '@/lib/api/types';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { LocationSwitcher } from '../../chrome/LocationSwitcher';
import { useGutter } from '../../chrome/OwnerPage';
import { useNotifications } from '../../data/useNotifications';
import { SalesSummary } from './SalesSummary';

const WIDE = 840;

const QUICK_LINKS: { key: string; icon: LucideIcon; href: string }[] = [
  { key: 'scan', icon: ScanLine, href: '/owner/scan' },
  { key: 'tables', icon: QrCode, href: '/owner/tables' },
  { key: 'menu', icon: UtensilsCrossed, href: '/owner/menu' },
  { key: 'feedback', icon: Inbox, href: '/owner/feedback' },
];

/** The top of Today: responsive desktop toolbar on wide screens, compact header on mobile. */
export function OverviewPanel({ dashboard }: { dashboard: OwnerDashboard }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { unseen } = useNotifications();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const gutter = useGutter();
  const firstName = useOwnerSession((state) => state.firstName);
  const date = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const bellBtn = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('ownerNotes.bellA11y', { count: unseen })}
      onPress={() => router.push('/owner/notifications')}
      style={({ pressed }) => [
        styles.bell,
        {
          borderColor: theme.line,
          backgroundColor: pressed ? theme.wash : theme.surface,
        },
      ]}
    >
      <Bell size={18} color={theme.text} />
      {unseen > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.fill }]}>
          <Text variant="caption" style={[styles.badgeText, { color: theme.onFill }]}>
            {unseen > 99 ? '99+' : unseen}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <View
      style={[
        styles.panel,
        {
          paddingTop: wide ? tokens.space[4] : insets.top + tokens.space[2],
          paddingBottom: wide ? tokens.space[4] : tokens.space[4],
          paddingHorizontal: gutter,
          backgroundColor: theme.surface,
          borderBottomColor: theme.line,
        },
      ]}
    >
      <View style={styles.inner}>
        {wide ? (
          <View style={styles.desktopRow}>
            <View style={styles.greetingCol}>
              <Text variant="title" accessibilityRole="header">
                {firstName ? t('ownerDash.greeting', { name: firstName }) : t('owner.dashboard')}
              </Text>
              <Text variant="caption" style={{ color: theme.muted }}>
                {date}
              </Text>
            </View>
            <View style={styles.actionsRow}>
              {QUICK_LINKS.map(({ key, icon: Icon, href }) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={t(`ownerDash.quick.${key}`)}
                  onPress={() => router.push(href as Href)}
                  style={({ pressed }) => [
                    styles.quickPill,
                    {
                      borderColor: theme.line,
                      backgroundColor: pressed ? theme.wash : theme.bg,
                    },
                  ]}
                >
                  <Icon size={16} color={theme.ink} />
                  <Text variant="caption" style={styles.quickLabel}>
                    {t(`ownerDash.quick.${key}`)}
                  </Text>
                </Pressable>
              ))}
              {bellBtn}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.top}>
              <LocationSwitcher variant="chip" />
              {bellBtn}
            </View>
            <View style={styles.greetingCol}>
              <Text variant="display-m" accessibilityRole="header">
                {firstName ? t('ownerDash.greeting', { name: firstName }) : t('owner.dashboard')}
              </Text>
              <Text variant="caption" style={{ color: theme.muted }}>
                {date}
              </Text>
            </View>
          </>
        )}

        {PAYMENTS_ENABLED ? <SalesSummary dashboard={dashboard} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderBottomWidth: 1,
  },
  inner: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    gap: tokens.space[4],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  desktopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[4],
  },
  greetingCol: {
    gap: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    height: 40,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  quickLabel: {
    fontFamily: 'Inter_600',
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: 'Inter_600', fontSize: 11, lineHeight: 14 },
});
