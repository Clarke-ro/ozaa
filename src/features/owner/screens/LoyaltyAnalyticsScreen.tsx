import { makeStyles } from '@/ui/makeStyles';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait } from '../chrome/OwnerPage';
import { DeskCard, IconTile, StatTile } from '../kit';

export function LoyaltyAnalyticsScreen({ venueId }: { venueId: string }) {
  const styles = useStyles();
  const theme = useTheme();
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  const analytics = useQuery({
    queryKey: ['owner-loyalty-analytics', venueId, range],
    queryFn: () => api.ownerGetLoyaltyAnalytics(venueId, range),
    enabled: Boolean(venueId),
  });

  const report = analytics.data;

  const enrolledCount = report?.enrolledCount ?? 0;
  const stampsIssued = report?.stampsIssued ?? 0;
  const rewardsRedeemed = report?.rewardsRedeemed ?? 0;
  const newEnrollments = report?.newEnrollments ?? 0;
  const series = report?.series ?? [];

  const maxStamps = Math.max(...series.map((s) => s.stampsIssued), 1);

  return (
    <DeskWait
      loading={analytics.isLoading}
      error={analytics.isError}
      onRetry={() => void analytics.refetch()}
    >
      <View style={styles.stack}>
        {/* Date Range Selector */}
        <View style={styles.rangeRow}>
          <Text variant="caption" style={{ color: theme.meta, fontWeight: '700' }}>
            REPORTING WINDOW
          </Text>
          <View style={styles.rangeChips}>
            {(['7d', '30d', '90d'] as const).map((r) => {
              const selected = range === r;
              return (
                <Pressable
                  key={r}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setRange(r)}
                  style={[
                    styles.rangeChip,
                    {
                      borderColor: selected ? theme.fill : theme.line,
                      backgroundColor: selected ? theme.fill : theme.surface,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: selected ? theme.onFill : theme.text,
                      fontWeight: selected ? '700' : '500',
                    }}
                  >
                    Last {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 4 Primary KPI Tiles */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCol}>
            <StatTile
              label="Cards Enrolled"
              value={String(enrolledCount)}
              note="Total loyalty members"
            />
          </View>
          <View style={styles.kpiCol}>
            <StatTile
              label="New Members"
              value={String(newEnrollments)}
              note="Joined during period"
            />
          </View>
          <View style={styles.kpiCol}>
            <StatTile
              label="Stamps Issued"
              value={String(stampsIssued)}
              note="Total punches awarded"
            />
          </View>
          <View style={styles.kpiCol}>
            <StatTile
              label="Rewards Claimed"
              value={String(rewardsRedeemed)}
              note="Free dishes redeemed"
            />
          </View>
        </View>

        {/* Visual Trend Chart */}
        <DeskCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <IconTile icon={TrendingUp} tone="tint" size={32} />
            <View>
              <Text variant="title">Daily Stamps & Enrollments Trend</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Punches issued and diner signups over the last {range}
              </Text>
            </View>
          </View>

          {series.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text variant="caption" style={{ color: theme.meta }}>
                No activity recorded in this time range.
              </Text>
            </View>
          ) : (
            <View style={styles.barsContainer}>
              {series.slice(-14).map((pt, idx) => {
                const heightPct = Math.round((pt.stampsIssued / maxStamps) * 100);
                const dayLabel = new Date(pt.date).toLocaleDateString(undefined, {
                  weekday: 'narrow',
                });

                return (
                  <View key={pt.date ?? idx} style={styles.barCol}>
                    <Text variant="caption" style={styles.barValueText}>
                      {pt.stampsIssued}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max(heightPct, 6)}%`,
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
                Stamps Issued
              </Text>
            </View>
          </View>
        </DeskCard>
      </View>
    </DeskWait>
  );
}

const useStyles = makeStyles((theme) => ({
  stack: { gap: tokens.space[4] },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  rangeChips: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  kpiCol: {
    flex: 1,
    minWidth: 140,
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
  emptyChart: {
    paddingVertical: tokens.space[6],
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    paddingTop: tokens.space[4],
    paddingBottom: tokens.space[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barTrack: {
    width: 14,
    height: 110,
    backgroundColor: theme.wash,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barValueText: {
    fontSize: 10,
    color: theme.meta,
  },
  dayLabel: {
    fontSize: 11,
    color: theme.meta,
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
}));
