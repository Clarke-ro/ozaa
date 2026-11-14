import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Frown, Meh, Smile, type LucideIcon } from 'lucide-react-native';
import type { InsightsReport } from '@/lib/api/types';
import { STATUS_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { VenueImage } from '@/ui/VenueImage';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { ownerKeys } from '../../data/keys';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { TitledSection } from '../../kit';
import { moodTotals } from './insightsModel';

type Props = { report: InsightsReport; style?: object };

/** A row with a label, a figure on the right and a thin bar under them (canvas lists). */
function BarRow({
  photo,
  icon: Icon,
  iconInk,
  label,
  value,
  share,
  ink,
  first,
}: {
  /** A dish photo on the left (canvas "Most viewed dishes"). */
  photo?: string | null;
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
      {photo !== undefined ? (
        <View style={[styles.thumb, { backgroundColor: theme.wash }]}>
          {photo ? <VenueImage url={photo} alt={label} style={StyleSheet.absoluteFill} /> : null}
        </View>
      ) : null}
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
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const slug = venue.data?.slug ?? '';
  // Photos come from the menu; the report only names the dish.
  const menu = useQuery({
    queryKey: ownerKeys.menu(slug),
    queryFn: () => api.getMenu(slug),
    enabled: Boolean(slug),
  });
  const photoOf = (name: string) =>
    menu.data?.items.find((i) => i.name.en === name)?.photo?.url ?? null;
  const top = [...r.topItems].sort((a, b) => b.count - a.count).slice(0, 5);
  const most = Math.max(1, ...top.map((d) => d.count));
  return (
    <TitledSection title={t('ownerInsights.topDishes')} style={style} cardStyle={styles.listCard}>
      {top.length === 0 ? (
        <Text variant="body" style={[styles.empty, { color: theme.muted }]}>
          {t('ownerDash.noTrend')}
        </Text>
      ) : (
        top.map((d, i) => (
          <BarRow
            key={d.name}
            first={i === 0}
            photo={photoOf(d.name)}
            label={d.name}
            value={t('ownerInsights.ordered', { count: d.count })}
            share={(d.count / most) * 100}
            ink={theme.fill}
          />
        ))
      )}
    </TitledSection>
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
    <TitledSection title={t('ownerInsights.mood')} style={style} cardStyle={styles.moodCard}>
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
    </TitledSection>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  thumb: { width: 48, height: 48, borderRadius: 10, overflow: 'hidden' },
  flex: { flex: 1, minWidth: 0, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  name: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.strong },
  value: { fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  empty: { paddingVertical: tokens.space[4] },
  more: { marginTop: tokens.space[2], minHeight: 44 },
});
