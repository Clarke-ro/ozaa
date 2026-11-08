import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ClipboardList,
  Eye,
  Grid2x2,
  Hourglass,
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
import { DeskWait, SkeletonBlock, useGutter } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { StatTile } from '../../kit';
import { NeedsYou } from './NeedsYou';
import { LiveOrders } from './LiveOrders';
import { OverviewPanel } from './OverviewPanel';
import { SetupCard } from './SetupCard';

// Live data refreshes every few seconds while the screen is open; the kitchen moves fast.
const LIVE_MS = 5000;
const WIDE = 840;
const SPLIT_AT = 1024;

const SHORTCUTS: { key: string; icon: LucideIcon; href: string }[] = [
  { key: 'scan', icon: ScanLine, href: '/owner/scan' },
  { key: 'tables', icon: QrCode, href: '/owner/tables' },
  { key: 'menu', icon: UtensilsCrossed, href: '/owner/menu' },
  { key: 'feedback', icon: Inbox, href: '/owner/feedback' },
];

/** Today: overview header, six live metrics, and a responsive workspace for open tickets & alerts. */
export function DashboardScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const gutter = useGutter();
  const wide = width >= WIDE;
  const split = width >= SPLIT_AT;
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const desk = useQuery({
    queryKey: ownerKeys.dashboard(venueId),
    queryFn: () => api.ownerGetDashboard(venueId),
    enabled: Boolean(venueId),
    refetchInterval: LIVE_MS,
  });
  const d = desk.data;
  const basis =
    fontScale > 1.5
      ? '100%'
      : width >= 1200
        ? '15%'
        : width >= 700
          ? '31%'
          : '47%';

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
              {!wide ? (
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
                      <View style={[styles.shortcutIcon, { backgroundColor: theme.wash }]}>
                        <Icon size={18} color={theme.ink} />
                      </View>
                      <Text variant="caption" numberOfLines={1} style={styles.center}>
                        {t(`ownerDash.quick.${key}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.grid}>
                <View style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    label={t('ownerDash.stats.ordersToday')}
                    value={String(d.ordersToday)}
                    icon={ClipboardList}
                    onPress={() => router.push('/owner/orders')}
                  />
                </View>
                <View style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    label={t('ownerDash.stats.pending')}
                    value={String(d.pendingOrders)}
                    icon={Hourglass}
                    tone={d.pendingOrders > 0 ? 'alert' : undefined}
                    onPress={() => router.push('/owner/orders')}
                  />
                </View>
                <View style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    label={t('ownerDash.stats.visitors')}
                    value={String(d.visitorsToday)}
                    icon={Eye}
                    onPress={() => router.push('/owner/insights')}
                  />
                </View>
                <View style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    label={t('owner.openTables')}
                    value={String(d.openTables)}
                    icon={Grid2x2}
                    onPress={() => router.push('/owner/floor')}
                  />
                </View>
                <View style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    label={t('owner.waiterCalls')}
                    value={String(d.openCalls)}
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
                        ? undefined
                        : t('ownerDash.ratingOf', { count: d.ratingCount })
                    }
                    icon={Star}
                    onPress={() => router.push('/owner/reviews')}
                  />
                </View>
              </View>

              {split ? (
                <View style={styles.workspace}>
                  <View style={styles.mainCol}>
                    <LiveOrders venueId={venueId} />
                  </View>
                  <View style={styles.sideCol}>
                    <NeedsYou />
                    <SetupCard />
                  </View>
                </View>
              ) : (
                <>
                  <SetupCard />
                  <NeedsYou />
                  <LiveOrders venueId={venueId} />
                </>
              )}
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
    paddingTop: tokens.space[6],
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  workspace: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[6],
  },
  mainCol: {
    flex: 1.35,
    minWidth: 0,
  },
  sideCol: {
    flex: 1,
    minWidth: 0,
    gap: tokens.space[5],
  },
  shortcuts: { flexDirection: 'row', gap: tokens.space[2] },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    gap: tokens.space[2],
    paddingVertical: tokens.space[3],
    borderWidth: 1,
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
