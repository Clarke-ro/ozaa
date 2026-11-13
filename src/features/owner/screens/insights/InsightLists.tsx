import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Frown, Meh, Smile, type LucideIcon } from 'lucide-react-native';
import type { InsightsReport } from '@/lib/api/types';
import { STATUS_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { InsightSection } from './InsightSection';
import { moodTotals } from './insightsModel';

type Props = { report: InsightsReport; style?: object };

/** A row with a label, a figure on the right and a thin bar under them (canvas lists). */
function BarRow({
  icon: Icon,
  iconInk,
  label,
  value,
  share,
  ink,
  first,
}: {
  icon?: LucideIcon;
  iconInk?: string;
  label: string;
  value: string;
  share: number;
  ink: string;
  first: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.row, !first && { borderTopWidth: 1, borderTopColor: theme.wash }]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      {Icon ? <Icon size={20} color={iconInk ?? theme.muted} /> : null}
      <View style={styles.flex}>
        <View style={styles.top}>
          <Text style={[styles.name, styles.flex]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.value, { color: theme.muted }]}>{value}</Text>
        </View>
        <View style={[styles.track, { backgroundColor: theme.wash }]}>
          <View style={[styles.fill, { backgroundColor: ink, width: `${share}%` }]} />
        </View>
      </View>
    </View>
  );
}

/**
 * The dishes ordered most in the period. The canvas shows menu views per dish too; the report
 * only counts orders, so each row says how many were ordered.
 */
export function TopDishesList({ report: r, style }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const top = [...r.topItems].sort((a, b) => b.count - a.count).slice(0, 5);
  const most = Math.max(1, ...top.map((d) => d.count));
  return (
    <InsightSection title={t('ownerInsights.topDishes')} style={style} cardStyle={styles.listCard}>
      {top.length === 0 ? (
        <Text variant="body" style={[styles.empty, { color: theme.muted }]}>
          {t('ownerDash.noTrend')}
        </Text>
      ) : (
        top.map((d, i) => (
          <BarRow
            key={d.name}
            first={i === 0}
            label={d.name}
            value={t('ownerInsights.ordered', { count: d.count })}
            share={(d.count / most) * 100}
            ink={theme.fill}
          />
        ))
      )}
    </InsightSection>
  );
}

/** How guests felt in their notes, one row per mood, and a way to read them. */
export function MoodList({ report: r, style }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const tones = STATUS_TONES[theme.scheme];
  const mood = moodTotals(r);
  const total = mood.positive + mood.neutral + mood.negative;
  const rows = [
    { key: 'positive', icon: Smile, ink: tones.success.line, count: mood.positive },
    { key: 'neutral', icon: Meh, ink: theme.meta, count: mood.neutral },
    { key: 'negative', icon: Frown, ink: tones.alert.line, count: mood.negative },
  ] as const;
  return (
    <InsightSection title={t('ownerInsights.mood')} style={style} cardStyle={styles.moodCard}>
      {total === 0 ? (
        <Text variant="body" style={[styles.empty, { color: theme.muted }]}>
          {t('ownerDash.noTrend')}
        </Text>
      ) : (
        <>
          {rows.map((row, i) => (
            <Fragment key={row.key}>
              <BarRow
                first={i === 0}
                icon={row.icon}
                iconInk={row.ink}
                label={t(`ownerFeedback.mood.${row.key}`)}
                value={t('ownerInsights.notesCount', { count: row.count })}
                share={(row.count / total) * 100}
                ink={row.ink}
              />
            </Fragment>
          ))}
          <Button
            label={t('ownerInsights.readNotes')}
            tone="secondary"
            onPress={() => router.push('/owner/feedback')}
            style={styles.more}
          />
        </>
      )}
    </InsightSection>
  );
}

const styles = StyleSheet.create({
  listCard: {
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: tokens.owner.controls.cardPadding,
  },
  moodCard: {
    paddingTop: 4,
    paddingBottom: 16,
    paddingHorizontal: tokens.owner.controls.cardPadding,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], paddingVertical: 12 },
  flex: { flex: 1, minWidth: 0, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  name: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.strong },
  value: { fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  empty: { paddingVertical: tokens.space[4] },
  more: { marginTop: tokens.space[2], minHeight: 44 },
});
