import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Clock, TrendingUp, Trophy, Users } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { InsightsReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { BigStat, DeskCard, IconTile } from '../kit';

const RANGES: InsightsReport['range'][] = ['today', '7d', '30d'];

export function InsightsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [range, setRange] = useState<InsightsReport['range']>('7d');

  const report = useQuery({
    queryKey: ['owner-insights', venueId, range],
    queryFn: () => api.ownerGetInsights(venueId, range),
    enabled: Boolean(venueId),
  });

  const data = report.data;
  const maxPesewas = Math.max(1, ...(data?.series.map((point) => point.pesewas) ?? [1]));
  const maxPeakOrders = Math.max(1, ...(data?.peakHours.map((h) => h.orders) ?? [1]));
  const totalTopItemPesewas = data?.topItems.reduce((acc, item) => acc + item.pesewas, 0) ?? 1;

  const labels = {
    today: t('owner.rangeToday'),
    '7d': t('owner.rangeWeek'),
    '30d': t('owner.rangeMonth'),
  };

  return (
    <OwnerPage
      title={t('owner.insights')}
      subtitle="Sales analytics, busiest table ordering hours, and top revenue dishes."
    >
      {/* Range switch filter */}
      <View style={styles.rangesBar}>
        {RANGES.map((value) => {
          const isSelected = range === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={labels[value]}
              onPress={() => setRange(value)}
              style={[
                styles.rangePill,
                {
                  borderColor: isSelected ? theme.black : theme.line,
                  backgroundColor: isSelected ? '#111111' : '#FFFFFF',
                },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  color: isSelected ? '#FFFFFF' : theme.text,
                  fontWeight: '700',
                }}
              >
                {labels[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <DeskWait loading={report.isLoading} error={report.isError} onRetry={() => void report.refetch()}>
        {data ? (
          <View style={styles.contentStack}>
            {/* Headline Revenue Card */}
            <DeskCard style={styles.revenueCard}>
              <View style={styles.revenueHeader}>
                <View style={styles.revenueTitleRow}>
                  <IconTile icon={TrendingUp} tone="tint" size={36} />
                  <View>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      TOTAL REVENUE ({labels[range].toUpperCase()})
                    </Text>
                    <Text variant="title">Net Sales Summary</Text>
                  </View>
                </View>
                {data.sample ? (
                  <View style={styles.sampleBadge}>
                    <Text variant="caption" style={{ color: '#888888', fontWeight: '700' }}>
                      {t('owner.sampleMark')}
                    </Text>
                  </View>
                ) : null}
              </View>

              <BigStat
                label="Net Sales"
                value={formatMoney(pesewas(data.salesPesewas), data.currency)}
                note={`Revenue generated from guest table orders and cash markups in ${labels[range].toLowerCase()}`}
              />

              {/* Bar Chart Visualization */}
              <View style={styles.chartWrapper}>
                <View style={styles.chartBars}>
                  {data.series.map((point) => {
                    const heightPercent = Math.max(10, (point.pesewas / maxPesewas) * 100);
                    return (
                      <View key={point.label} style={styles.barCol}>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${heightPercent}%`,
                                backgroundColor: heightPercent > 80 ? '#D24000' : '#111111',
                              },
                            ]}
                          />
                        </View>
                        <Text variant="caption" style={styles.barLabel}>
                          {point.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </DeskCard>

            {/* Repeat Customers & Retention Card */}
            <DeskCard style={styles.retentionCard}>
              <View style={styles.cardHeaderRow}>
                <IconTile icon={Users} tone="wash" size={36} />
                <View>
                  <Text variant="title">Customer Retention</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Loyalty return rate
                  </Text>
                </View>
              </View>
              <View style={styles.retentionStatsRow}>
                <View style={styles.retentionStatCol}>
                  <Text variant="display-m" style={styles.retentionNumber}>
                    {data.repeatGuests.sharePercent}%
                  </Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Repeat Guest Share
                  </Text>
                </View>
                <View style={styles.retentionTextCol}>
                  <Text variant="body">
                    {t('owner.repeat', {
                      count: data.repeatGuests.count,
                      percent: data.repeatGuests.sharePercent,
                    })}
                  </Text>
                </View>
              </View>
            </DeskCard>

            {/* Top dishes ranking */}
            <DeskCard style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <IconTile icon={Trophy} tone="tint" size={36} />
                <View>
                  <Text variant="title">{t('owner.topItems')}</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Ranked by frequency and gross billings
                  </Text>
                </View>
              </View>

              <View style={styles.topItemsList}>
                {data.topItems.map((item, index) => {
                  const share = Math.round((item.pesewas / totalTopItemPesewas) * 100);
                  return (
                    <View key={item.name} style={styles.topItemRow}>
                      <View style={styles.rankBadge}>
                        <Text variant="caption" style={styles.rankText}>
                          #{index + 1}
                        </Text>
                      </View>

                      <View style={styles.topItemMeta}>
                        <View style={styles.topItemTitleRow}>
                          <Text variant="body-strong">{item.name}</Text>
                          <Text variant="body-strong" style={{ fontVariant: ['tabular-nums'] }}>
                            {formatMoney(pesewas(item.pesewas), data.currency)}
                          </Text>
                        </View>

                        <View style={styles.topItemSubRow}>
                          <Text variant="caption" style={{ color: theme.meta }}>
                            {item.count} orders ({share}% of top sales)
                          </Text>
                          <View style={styles.itemShareBar}>
                            <View
                              style={[
                                styles.itemShareFill,
                                {
                                  width: `${Math.min(100, Math.max(12, share))}%`,
                                  backgroundColor: index === 0 ? '#D24000' : '#111111',
                                },
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </DeskCard>

            {/* Peak Ordering Hours */}
            <DeskCard style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <IconTile icon={Clock} tone="wash" size={36} />
                <View>
                  <Text variant="title">{t('owner.peak')}</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Order volume distribution throughout service
                  </Text>
                </View>
              </View>

              <View style={styles.peakGrid}>
                {data.peakHours.map((hour) => {
                  const densityPercent = Math.max(15, (hour.orders / maxPeakOrders) * 100);
                  return (
                    <View key={hour.hour} style={styles.peakSlot}>
                      <Text variant="body-strong">{hour.hour}:00</Text>
                      <View style={styles.peakSlotBarTrack}>
                        <View
                          style={[
                            styles.peakSlotBarFill,
                            {
                              width: `${densityPercent}%`,
                              backgroundColor: densityPercent > 70 ? '#D24000' : '#4B5563',
                            },
                          ]}
                        />
                      </View>
                      <Text variant="caption" style={{ color: theme.meta, fontVariant: ['tabular-nums'] }}>
                        {hour.orders} orders
                      </Text>
                    </View>
                  );
                })}
              </View>
            </DeskCard>
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  rangesBar: {
    flexDirection: 'row',
    gap: tokens.space[2],
    marginBottom: tokens.space[2],
  },
  rangePill: {
    minHeight: 38,
    paddingHorizontal: tokens.space[4],
    borderWidth: 1,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentStack: {
    gap: tokens.space[3],
  },
  revenueCard: {
    gap: tokens.space[3],
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  revenueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  sampleBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: tokens.space[2],
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
  },
  chartWrapper: {
    paddingTop: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.space[2],
    height: 120,
    paddingTop: tokens.space[2],
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: tokens.radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: tokens.radius.sm,
  },
  barLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  retentionCard: {
    gap: tokens.space[2],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  retentionStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    paddingTop: tokens.space[1],
  },
  retentionStatCol: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingRight: tokens.space[4],
  },
  retentionNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#D24000',
  },
  retentionTextCol: {
    flex: 1,
  },
  sectionCard: {
    gap: tokens.space[3],
  },
  topItemsList: {
    gap: tokens.space[2],
  },
  topItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[1],
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontWeight: '700',
    color: '#374151',
    fontSize: 11,
  },
  topItemMeta: {
    flex: 1,
    gap: 4,
  },
  topItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topItemSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[2],
  },
  itemShareBar: {
    width: 80,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  itemShareFill: {
    height: '100%',
    borderRadius: 3,
  },
  peakGrid: {
    gap: tokens.space[2],
  },
  peakSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  peakSlotBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
  },
  peakSlotBarFill: {
    height: '100%',
    borderRadius: tokens.radius.full,
  },
});
