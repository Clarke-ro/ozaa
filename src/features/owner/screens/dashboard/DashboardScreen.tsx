import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ClipboardList,
  Grid2x2,
  Inbox,
  QrCode,
  ScanLine,
  Star,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, SkeletonBlock } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { StatTile } from '../../kit';
import { NeedsYou } from './NeedsYou';
import { LiveOrders } from './LiveOrders';
import { OverviewPanel } from './OverviewPanel';
import { SetupCard } from './SetupCard';

// Live data refreshes every few seconds while the screen is open; the kitchen moves fast.
const LIVE_MS = 5000;

const SHORTCUTS: { key: string; icon: LucideIcon; href: string }[] = [
  { key: 'scan', icon: ScanLine, href: '/owner/scan' },
  { key: 'tables', icon: QrCode, href: '/owner/tables' },
  { key: 'menu', icon: UtensilsCrossed, href: '/owner/menu' },
  { key: 'feedback', icon: Inbox, href: '/owner/feedback' },
];

/** Today: the overview panel, shortcuts, the setup checklist (until done), what needs you, four live numbers, and the open tickets. */
export function DashboardScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const desk = useQuery({
    queryKey: ownerKeys.dashboard(venueId),
    queryFn: () => api.ownerGetDashboard(venueId),
    enabled: Boolean(venueId),
    refetchInterval: LIVE_MS,
  });
  const d = desk.data;
  // Two columns on phones, four on wide screens, one at the largest text sizes.
  const basis = fontScale > 1.5 ? '100%' : width >= 700 ? '23%' : '47%';
  const gutter = width >= 768 ? tokens.space[6] : tokens.space[4];

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.scroll}>
      <DeskWait
        loading={desk.isLoading}
        error={desk.isError}
        onRetry={() => void desk.refetch()}
        skeleton={<SkeletonBlock height={360} />}
      >
        {d ? (
          <>
            <OverviewPanel dashboard={d} />
            <View style={[styles.body, { paddingHorizontal: gutter }]}>
              <View style={styles.shortcuts}>
                {SHORTCUTS.map(({ key, icon: Icon, href }) => (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={t(`ownerDash.quick.${key}`)}
                    onPress={() => router.push(href as Href)}
                    style={({ pressed }) => [
                      styles.shortcut,
                      {
                        borderColor: theme.line,
                        backgroundColor: pressed ? theme.wash : theme.surface,
                      },
                    ]}
                  >
                    <View style={styles.shortcutIcon}>
                      <Icon size={20} color={theme.ink} />
                    </View>
                    <Text variant="caption" numberOfLines={1} style={styles.center}>
                      {t(`ownerDash.quick.${key}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <SetupCard />
              <NeedsYou />
              <View style={styles.grid}>
                <View style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    label={t('owner.liveOrders')}
                    value={String(d.liveOrders)}
                    note={t('ownerDash.notes.orders')}
                    icon={ClipboardList}
                    onPress={() => router.push('/owner/orders')}
                  />
                </View>
                <View style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    label={t('owner.openTables')}
                    value={String(d.openTables)}
                    note={t('ownerDash.notes.tables')}
                    icon={Grid2x2}
                    onPress={() => router.push('/owner/floor')}
                  />
                </View>
                <View style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    label={t('owner.waiterCalls')}
                    value={String(d.openCalls)}
                    note={
                      d.openCalls > 0
                        ? t('ownerDash.notes.callsWaiting')
                        : t('ownerDash.notes.callsQuiet')
                    }
                    icon={Bell}
                    tone={d.openCalls > 0 ? 'alert' : undefined}
                    onPress={() => router.push('/owner/calls')}
                  />
                </View>
                <View style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    label={t('owner.rating')}
                    value={d.ratingAverage == null ? '–' : d.ratingAverage.toFixed(1)}
                    note={
                      d.ratingAverage == null
                        ? t('owner.noRating')
                        : t('ownerDash.ratingOf', { count: d.ratingCount })
                    }
                    icon={Star}
                    onPress={() => router.push('/owner/reviews')}
                  />
                </View>
              </View>
              <LiveOrders venueId={venueId} />
            </View>
          </>
        ) : null}
      </DeskWait>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: tokens.space[16] + tokens.space[8] },
  body: {
    gap: tokens.space[6],
    paddingTop: tokens.space[5],
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  shortcuts: { flexDirection: 'row', gap: tokens.space[2] },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    gap: tokens.space[2],
    paddingVertical: tokens.space[3],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
