import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
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
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage, SkeletonBlock } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { BigStat, QuickAction, StatTile } from '../../kit';
import { salesLine } from '../../desk/dashboardModel';
import { AlertsCard } from './AlertsCard';
import { LiveOrders } from './LiveOrders';
import { TrendsSection } from './TrendsSection';

// Live data refreshes every few seconds while the screen is open; the kitchen moves fast.
const LIVE_MS = 5000;

export function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const firstName = useOwnerSession((state) => state.firstName);

  const desk = useQuery({
    queryKey: ownerKeys.dashboard(venueId),
    queryFn: () => api.ownerGetDashboard(venueId),
    enabled: Boolean(venueId),
    refetchInterval: LIVE_MS,
  });

  const d = desk.data;
  const line = d ? salesLine(d) : null;
  const sales = d ? formatMoney(pesewas(d.salesTodayPesewas), d.currency) : '';
  // Two stat columns on phones, four when there is room; one column at the largest text sizes.
  const statBasis = fontScale > 1.5 ? '100%' : width >= 700 ? '23%' : '47%';

  return (
    <OwnerPage
      title={firstName ? t('ownerDash.greeting', { name: firstName }) : t('owner.dashboard')}
    >
      <DeskWait
        loading={desk.isLoading}
        error={desk.isError}
        onRetry={() => void desk.refetch()}
        skeleton={
          <>
            <SkeletonBlock height={88} />
            <SkeletonBlock height={120} />
            <SkeletonBlock height={160} />
          </>
        }
      >
        {d && line ? (
          <View style={styles.stack}>
            <BigStat
              label={t('ownerDash.salesToday')}
              value={sales}
              note={t(line.key, { amount: sales, percent: line.percent ?? 0 })}
              deltaTone={line.tone}
            />

            <AlertsCard alerts={d.alerts} />

            <View style={styles.grid}>
              <View style={{ flexBasis: statBasis, flexGrow: 1 }}>
                <StatTile
                  label={t('owner.liveOrders')}
                  value={String(d.liveOrders)}
                  icon={ClipboardList}
                  onPress={() => router.push('/owner/orders')}
                />
              </View>
              <View style={{ flexBasis: statBasis, flexGrow: 1 }}>
                <StatTile
                  label={t('owner.openTables')}
                  value={String(d.openTables)}
                  icon={Grid2x2}
                  onPress={() => router.push('/owner/floor')}
                />
              </View>
              <View style={{ flexBasis: statBasis, flexGrow: 1 }}>
                <StatTile
                  label={t('owner.waiterCalls')}
                  value={String(d.openCalls)}
                  icon={Bell}
                  tone={d.openCalls > 0 ? 'alert' : undefined}
                  onPress={() => router.push('/owner/calls')}
                />
              </View>
              <View style={{ flexBasis: statBasis, flexGrow: 1 }}>
                <StatTile
                  label={t('owner.rating')}
                  value={d.ratingAverage == null ? '–' : d.ratingAverage.toFixed(1)}
                  note={
                    d.ratingAverage == null
                      ? t('owner.noRating')
                      : t('ownerDash.ratingOf', {
                          avg: d.ratingAverage.toFixed(1),
                          count: d.ratingCount,
                        })
                  }
                  icon={Star}
                  onPress={() => router.push('/owner/reviews')}
                />
              </View>
            </View>

            <View style={styles.grid}>
              <QuickAction
                label={t('ownerDash.quick.scan')}
                icon={ScanLine}
                onPress={() => router.push('/owner/scan')}
              />
              <QuickAction
                label={t('ownerDash.quick.tables')}
                icon={QrCode}
                onPress={() => router.push('/owner/tables')}
              />
              <QuickAction
                label={t('ownerDash.quick.menu')}
                icon={UtensilsCrossed}
                onPress={() => router.push('/owner/menu')}
              />
              <QuickAction
                label={t('ownerDash.quick.feedback')}
                icon={Inbox}
                onPress={() => router.push('/owner/feedback')}
              />
            </View>

            <LiveOrders venueId={venueId} />
            <TrendsSection venueId={venueId} currency={d.currency} />
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[6] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
});
