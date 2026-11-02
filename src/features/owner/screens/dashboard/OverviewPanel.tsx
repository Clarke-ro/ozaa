import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { OwnerDashboard } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { LocationSwitcher } from '../../chrome/LocationSwitcher';
import { ownerKeys } from '../../data/keys';
import { salesLine } from '../../desk/dashboardModel';
import { BarChart, Segmented } from '../../kit';

type Range = 'today' | '7d' | '30d';
const RANGES: Range[] = ['today', '7d', '30d'];

/** The top of Today in the app's own theme: location, calls, the period, one big sales number and its bars. */
export function OverviewPanel({ dashboard }: { dashboard: OwnerDashboard }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const firstName = useOwnerSession((state) => state.firstName);
  const [range, setRange] = useState<Range>('today');
  const report = useQuery({
    queryKey: ownerKeys.insights(venueId, range),
    queryFn: () => api.ownerGetInsights(venueId, range),
    enabled: Boolean(venueId),
  });
  const money = (v: number) => formatMoney(pesewas(v), dashboard.currency);
  // Today uses the live dashboard figure; longer periods use the insights total.
  const total = range === 'today' ? dashboard.salesTodayPesewas : (report.data?.salesPesewas ?? 0);
  const line = salesLine(dashboard);
  const caption =
    range === 'today'
      ? t(line.key, { amount: money(total), percent: line.percent ?? 0 })
      : t(`ownerDash.rangeCaption.${range}`);
  // Today's series is by hour ("21"); show it as a time so it is not read as a date.
  const label = (l: string) =>
    range === 'today' && /^\d{1,2}$/.test(l) ? `${l.padStart(2, '0')}:00` : l;
  const bars = (report.data?.series ?? []).map((p) => ({
    label: label(p.label),
    value: p.pesewas,
  }));
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
          accessibilityLabel={t('ownerDash.callsA11y', { count: dashboard.openCalls })}
          onPress={() => router.push('/owner/calls')}
          style={({ pressed }) => [
            styles.bell,
            { backgroundColor: pressed ? theme.line : theme.surface },
          ]}
        >
          <Bell size={20} color={theme.text} />
          {dashboard.openCalls > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.fill }]}>
              <Text variant="caption" style={[styles.badgeText, { color: theme.onFill }]}>
                {dashboard.openCalls}
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

      <Segmented<Range>
        label={t('ownerDash.rangeLabel')}
        value={range}
        onChange={setRange}
        options={RANGES.map((id) => ({ id, label: t(`ownerInsights.range.${id}`) }))}
      />

      <View style={styles.figure} accessible accessibilityLabel={`${money(total)}. ${caption}`}>
        <Text variant="display-l" style={styles.total}>
          {money(total)}
        </Text>
        <Text variant="caption" style={[styles.caption, { color: theme.muted }]}>
          {caption}
        </Text>
      </View>

      {bars.length ? (
        <BarChart bars={bars} format={money} summary={t('ownerInsights.sales')} height={110} />
      ) : null}
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
  figure: { alignItems: 'center', gap: tokens.space[1] },
  total: { fontVariant: ['tabular-nums'] },
  caption: { textAlign: 'center' },
});
