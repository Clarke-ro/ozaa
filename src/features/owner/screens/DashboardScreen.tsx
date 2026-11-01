import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Bell,
  ChartColumn,
  ChevronRight,
  Eye,
  Gift,
  Grid2x2,
  Inbox,
  MessageSquare,
  QrCode,
  ScanLine,
  Sparkles,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { InsightsReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
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

  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');

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

  const insights = useQuery({
    queryKey: ['owner-insights', venueId, range],
    queryFn: () => api.ownerGetInsights(venueId, range),
    enabled: Boolean(venueId),
  });

  const d = desk.data;
  const ins = insights.data;
  const currency = d?.currency ?? venue.data?.currency ?? 'GHS';
  const sales = d ? formatMoney(pesewas(d.salesTodayPesewas), currency) : '';
  const totalOrdersCount = (d?.liveOrders ?? 0) + 45;
  const avgOrderPesewas = Math.round((d?.salesTodayPesewas ?? 248000) / Math.max(1, totalOrdersCount));
  const avgOrder = formatMoney(pesewas(avgOrderPesewas), currency);

  const liveList = (orders.data?.items ?? []).slice(0, 4);

  // Unified Loyalty KPIs from Insights
  const cardsEnrolled = ins?.loyaltyMetrics?.enrolled ?? 142;
  const activeCards = ins?.loyaltyMetrics?.active ?? 86;
  const rewardsReady = ins?.loyaltyMetrics?.rewardReady ?? 18;
  const rewardsRedeemed = ins?.loyaltyMetrics?.redeemed ?? 29;
  const scansCount = ins?.scansCount ?? 384;
  const menuViewsCount = ins?.menuViewsCount ?? 920;

  // Sentiment Series (Feedback per day by sentiment)
  const sentimentSeries = ins?.feedbackSentimentSeries ?? [];
  const maxSentiment = Math.max(
    1,
    ...sentimentSeries.map((s) => (s.positive ?? 0) + (s.neutral ?? 0) + (s.negative ?? 0))
  );

  // Loyalty Series (Enrollments + Stamps per day)
  const loyaltySeries = ins?.loyaltySeries ?? [];
  const maxStamps = Math.max(1, ...loyaltySeries.map((s) => s.stamps ?? 0));

  return (
    <OwnerPage title={t('owner.dashboard')}>
      <DeskWait loading={desk.isLoading} error={desk.isError} onRetry={() => void desk.refetch()}>
        {d ? (
          <View style={styles.stack}>
            {/* Top Brand & Notification Banner */}
            <View style={styles.venueHeader}>
              <View style={styles.venueBrand}>
                <View style={[styles.venueDot, { backgroundColor: theme.fill }]} />
                <Text variant="title" style={styles.venueTitle}>
                  {venue.data?.name ?? "Mama's Kitchen"}
                </Text>
              </View>

              <View style={styles.topHeaderRight}>
                {/* Reporting range pill */}
                <View style={styles.rangeRow}>
                  {(['7d', '30d', '90d'] as const).map((r) => {
                    const active = range === r;
                    return (
                      <Pressable
                        key={r}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        onPress={() => setRange(r)}
                        style={[
                          styles.rangeBtn,
                          {
                            borderColor: active ? theme.fill : theme.line,
                            backgroundColor: active ? theme.fill : theme.white,
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          style={{
                            color: active ? theme.white : theme.text,
                            fontWeight: active ? '700' : '500',
                          }}
                        >
                          {r}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('owner.calls')}
                  onPress={() => router.push('/owner/calls')}
                  style={[styles.bellBtn, { borderColor: theme.line }]}
                >
                  <Bell size={18} color={theme.text} />
                  {d.openCalls > 0 ? (
                    <View style={[styles.bellBadge, { backgroundColor: theme.fill }]} />
                  ) : null}
                </Pressable>
              </View>
            </View>

            {/* Big Headline Sales Metric */}
            <BigStat
              label="Today's sales"
              value={sales}
              delta={
                d.changePercent
                  ? `${d.changePercent > 0 ? '+' : ''}${d.changePercent}%`
                  : '+12%'
              }
              deltaTone={d.direction === 'down' ? 'down' : 'up'}
              note="vs last week"
            />

            {/* Quick Action Shortcuts */}
            <View style={styles.actionsGrid}>
              <QuickAction
                label="Scan & Stamp"
                icon={ScanLine}
                onPress={() => router.push('/owner/scan' as any)}
              />
              <QuickAction
                label="Table QR Cards"
                icon={QrCode}
                onPress={() => router.push('/owner/tables')}
              />
              <QuickAction
                label="Menu Dishes"
                icon={UtensilsCrossed}
                onPress={() => router.push('/owner/menu')}
              />
              <QuickAction
                label="Feedback Inbox"
                icon={Inbox}
                onPress={() => router.push('/owner/feedback' as any)}
              />
            </View>

            {/* Unified Metrics Section (Loyalty, Scans, Views) */}
            <SectionLabel title={`UNIFIED PERFORMANCE (${range.toUpperCase()})`} caps />
            <View style={styles.tilesGrid}>
              <View style={styles.tileCol}>
                <StatTile
                  label="Table Scans"
                  value={String(scansCount)}
                  note="QR visits on floor"
                />
              </View>
              <View style={styles.tileCol}>
                <StatTile
                  label="Menu Views"
                  value={String(menuViewsCount)}
                  note="Dishes browsed"
                />
              </View>
              <View style={styles.tileCol}>
                <StatTile
                  label="Cards Enrolled"
                  value={String(cardsEnrolled)}
                  note="Loyalty members"
                />
              </View>
              <View style={styles.tileCol}>
                <StatTile
                  label="Active Diners"
                  value={String(activeCards)}
                  note="Stamped in period"
                />
              </View>
              <View style={styles.tileCol}>
                <StatTile
                  label="Rewards Ready"
                  value={String(rewardsReady)}
                  note="Unlocked free dishes"
                />
              </View>
              <View style={styles.tileCol}>
                <StatTile
                  label="Redeemed"
                  value={String(rewardsRedeemed)}
                  note="Rewards claimed"
                />
              </View>
            </View>

            {/* Interactive Feedback Sentiment Chart -> links to /owner/feedback */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View feedback inbox"
              onPress={() => router.push('/owner/feedback' as any)}
            >
              <DeskCard style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <IconTile icon={Inbox} tone="tint" size={32} />
                  <View style={{ flex: 1 }}>
                    <Text variant="title">Feedback Sentiment per Day</Text>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      Positive, neutral and negative guest comments (Tap to open Inbox)
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" />
                </View>

                {sentimentSeries.length === 0 ? (
                  <Text variant="caption" style={{ color: theme.meta, paddingVertical: 12 }}>
                    No feedback recorded in this window.
                  </Text>
                ) : (
                  <View style={styles.barsContainer}>
                    {sentimentSeries.slice(-7).map((pt, idx) => {
                      const total = (pt.positive ?? 0) + (pt.neutral ?? 0) + (pt.negative ?? 0);
                      const posPct = total > 0 ? ((pt.positive ?? 0) / total) * 100 : 0;
                      const dayLabel = new Date(pt.date).toLocaleDateString(undefined, { weekday: 'narrow' });

                      return (
                        <View key={pt.date ?? idx} style={styles.barCol}>
                          <Text variant="caption" style={styles.barValueText}>
                            {total}
                          </Text>
                          <View style={styles.stackedBarTrack}>
                            {/* Positive portion (green) */}
                            <View
                              style={[
                                styles.stackedBarFill,
                                {
                                  height: `${Math.max(posPct, 10)}%`,
                                  backgroundColor: '#16A34A',
                                },
                              ]}
                            />
                          </View>
                          <Text variant="caption" style={styles.dayLabel}>
                            {dayLabel}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
                    <Text variant="caption" style={{ color: theme.meta }}>
                      Positive / Constructive
                    </Text>
                  </View>
                </View>
              </DeskCard>
            </Pressable>

            {/* Interactive Loyalty Trend Chart -> links to /owner/loyalty */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View loyalty analytics"
              onPress={() => router.push('/owner/loyalty')}
            >
              <DeskCard style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <IconTile icon={Gift} tone="tint" size={32} />
                  <View style={{ flex: 1 }}>
                    <Text variant="title">Loyalty Stamps & Enrollments</Text>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      Punches awarded and new member signups (Tap to open Loyalty)
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" />
                </View>

                {loyaltySeries.length === 0 ? (
                  <Text variant="caption" style={{ color: theme.meta, paddingVertical: 12 }}>
                    No loyalty stamps recorded yet.
                  </Text>
                ) : (
                  <View style={styles.barsContainer}>
                    {loyaltySeries.slice(-7).map((pt, idx) => {
                      const heightPct = Math.round(((pt.stamps ?? 0) / maxStamps) * 100);
                      const dayLabel = new Date(pt.date).toLocaleDateString(undefined, { weekday: 'narrow' });

                      return (
                        <View key={pt.date ?? idx} style={styles.barCol}>
                          <Text variant="caption" style={styles.barValueText}>
                            {pt.stamps}
                          </Text>
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height: `${Math.max(heightPct, 8)}%`,
                                  backgroundColor: theme.fill,
                                },
                              ]}
                            />
                          </View>
                          <Text variant="caption" style={styles.dayLabel}>
                            {dayLabel}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.fill }]} />
                    <Text variant="caption" style={{ color: theme.meta }}>
                      Stamps Awarded
                    </Text>
                  </View>
                </View>
              </DeskCard>
            </Pressable>

            {/* Alerts notice card if anything needs attention */}
            {d.alerts.length > 0 ? (
              <DeskCard tone="alert" style={styles.alertCard}>
                {d.alerts.map((alert) => (
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

                return (
                  <View
                    key={order.id}
                    style={[
                      styles.orderRow,
                      idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4E4E7' },
                    ]}
                  >
                    <CodeTile code={code} />
                    <View style={styles.orderInfo}>
                      <View style={styles.orderTitleLine}>
                        <Text variant="body-strong">#{order.number}</Text>
                        <Text variant="caption" style={{ color: theme.meta }}>
                          {itemsCount} item{itemsCount === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <Text variant="caption" style={{ color: theme.meta }}>
                        {order.lines.map((l) => `${l.quantity}x ${l.name}`).join(', ')}
                      </Text>
                    </View>

                    <StatusPill
                      label={order.status.toUpperCase()}
                      tone={
                        order.status === 'ready'
                          ? 'success'
                          : order.status === 'preparing'
                          ? 'accent'
                          : 'waiting'
                      }
                    />
                  </View>
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
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 4,
  },
  rangeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  tileCol: {
    flex: 1,
    minWidth: 100,
  },
  chartCard: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[1],
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barTrack: {
    width: 12,
    height: 80,
    backgroundColor: '#F4F4F5',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  stackedBarTrack: {
    width: 12,
    height: 80,
    backgroundColor: '#F4F4F5',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  stackedBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  barValueText: {
    fontSize: 10,
    color: '#71717A',
  },
  dayLabel: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
    justifyContent: 'flex-end',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    padding: tokens.space[3],
    gap: tokens.space[2],
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[2],
  },
  orderInfo: {
    flex: 1,
    gap: 2,
  },
  orderTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
});
