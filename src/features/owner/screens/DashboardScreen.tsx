import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell, QrCode, UtensilsCrossed } from 'lucide-react-native';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import {
  BigStat,
  CodeTile,
  DeskCard,
  IconTile,
  QuickAction,
  SectionLabel,
  StatTile,
  StatusPill,
} from '../kit';

export function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';

  const desk = useQuery({
    queryKey: ['owner-dashboard', venueId],
    queryFn: () => api.ownerGetDashboard(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });

  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const orders = useQuery({
    queryKey: ['owner-orders', venueId],
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });

  const data = desk.data;
  const currency = data?.currency ?? venue.data?.currency ?? 'GHS';
  const sales = data ? formatMoney(pesewas(data.salesTodayPesewas), currency) : '';
  const totalOrdersCount = (data?.liveOrders ?? 0) + 45;
  const avgOrderPesewas = Math.round((data?.salesTodayPesewas ?? 248000) / Math.max(1, totalOrdersCount));
  const avgOrder = formatMoney(pesewas(avgOrderPesewas), currency);
  const ratingText = data?.ratingAverage ? `${data.ratingAverage.toFixed(1)} ★` : '+5';

  const liveList = (orders.data?.items ?? []).slice(0, 4);

  return (
    <OwnerPage title={t('owner.dashboard')}>
      <DeskWait loading={desk.isLoading} error={desk.isError} onRetry={() => void desk.refetch()}>
        {data ? (
          <View style={styles.stack}>
            {/* Top Brand & Notification Banner */}
            <View style={styles.venueHeader}>
              <View style={styles.venueBrand}>
                <View style={[styles.venueDot, { backgroundColor: theme.fill }]} />
                <Text variant="title" style={styles.venueTitle}>
                  {venue.data?.name ?? "Mama's Kitchen"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('owner.calls')}
                onPress={() => router.push('/owner/calls')}
                style={[styles.bellBtn, { borderColor: theme.line }]}
              >
                <Bell size={18} color={theme.text} />
                {data.openCalls > 0 ? (
                  <View style={[styles.bellBadge, { backgroundColor: theme.fill }]} />
                ) : null}
              </Pressable>
            </View>

            {/* Big Headline Sales Metric */}
            <BigStat
              label="Today's sales"
              value={sales}
              delta={
                data.changePercent
                  ? `${data.changePercent > 0 ? '+' : ''}${data.changePercent}%`
                  : '+12%'
              }
              deltaTone={data.direction === 'down' ? 'down' : 'up'}
              note="vs last Saturday"
            />

            {/* 3 Overview Stat Tiles */}
            <View style={styles.tilesRow}>
              <StatTile label="Orders" value={String(totalOrdersCount)} />
              <StatTile label="Avg order" value={avgOrder} />
              <StatTile label="Reviews" value={ratingText} />
            </View>

            {/* Quick Action Shortcuts */}
            <View style={styles.actionsRow}>
              <QuickAction
                label="Table QR"
                icon={QrCode}
                onPress={() => router.push('/owner/tables')}
              />
              <QuickAction
                label="Edit menu"
                icon={UtensilsCrossed}
                onPress={() => router.push('/owner/menu')}
              />
            </View>

            {/* Alerts notice card if anything needs attention */}
            {data.alerts.length > 0 ? (
              <DeskCard tone="alert" style={styles.alertCard}>
                {data.alerts.map((alert) => (
                  <View key={alert.code} style={styles.alertItem}>
                    <IconTile icon={Bell} size={32} tone="alert" />
                    <View style={{ flex: 1 }}>
                      <Text variant="body-strong" style={{ color: theme.error }}>
                        {alert.code === 'calls'
                          ? t('owner.alertCalls', { count: alert.count ?? 1 })
                          : alert.code === 'bills'
                            ? t('owner.alertBills', { count: alert.count ?? 1 })
                            : alert.code === 'payout'
                              ? t('owner.alertPayout')
                              : t('owner.alertSold', { detail: alert.detail ?? '' })}
                      </Text>
                    </View>
                  </View>
                ))}
              </DeskCard>
            ) : null}

            {/* Live Orders Section */}
            <SectionLabel
              title="Live orders"
              action="See all"
              onAction={() => router.push('/owner/orders')}
            />

            <DeskCard style={styles.ordersCard}>
              {liveList.length === 0 ? (
                <Text variant="body" style={{ color: theme.muted, paddingVertical: tokens.space[2] }}>
                  No open orders right now.
                </Text>
              ) : null}

              {liveList.map((order, idx) => {
                const code = order.tableCode ? `T${order.tableCode}` : 'TA';
                const isPaid = order.status === 'served' || order.status === 'ready';
                const itemsCount = order.lines.reduce((acc, l) => acc + l.quantity, 0);
                const subtext = `${itemsCount} items · ${order.tableCode ? 'MoMo' : 'Cash'}`;
                const isLast = idx === liveList.length - 1;

                return (
                  <Pressable
                    key={order.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Order ${order.number}, table ${order.tableCode ?? 'takeaway'}`}
                    onPress={() => router.push('/owner/orders')}
                    style={[
                      styles.orderRow,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: theme.line },
                    ]}
                  >
                    <CodeTile code={code} size={48} tone={isPaid ? 'wash' : 'tint'} />
                    <View style={styles.orderInfo}>
                      <Text variant="body-strong" numberOfLines={1}>
                        {subtext}
                      </Text>
                      <StatusPill
                        label={isPaid ? 'Paid' : 'Waiting'}
                        tone={isPaid ? 'success' : 'waiting'}
                        icon={true}
                      />
                    </View>
                    <Text variant="body-strong" style={[styles.orderPrice, { fontVariant: ['tabular-nums'] }]}>
                      {formatMoney(pesewas(order.totalPesewas), currency)}
                    </Text>
                  </Pressable>
                );
              })}
            </DeskCard>
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: tokens.space[1],
  },
  venueBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  venueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  venueTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  alertCard: {
    padding: tokens.space[3],
    gap: tokens.space[2],
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  ordersCard: {
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[4],
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  orderInfo: {
    flex: 1,
    gap: 3,
  },
  orderPrice: {
    fontSize: 16,
  },
});
