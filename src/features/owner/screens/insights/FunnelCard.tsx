import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Info } from 'lucide-react-native';
import type { InsightsReport } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { funnelSteps, menuDropOff } from './insightsModel';

/**
 * "From scan to order" (design canvas): one card per step with its number, a thin bar for its share
 * of scans and a grey line under it, then a row about guests who opened the menu but left, with a
 * link to improve the menu.
 */
export function FunnelCard({ report: r, wide }: { report: InsightsReport; wide: boolean }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const steps = funnelSteps(r);
  const dropped = menuDropOff(r);
  const n = (v: number) => v.toLocaleString(i18n.language);
  const note = (i: number, ofPrevious: number | null) =>
    i === 0
      ? t('ownerInsights.scanNote')
      : t(`ownerInsights.ofPrevious.${i === 1 ? 'scans' : 'views'}`, { percent: ofPrevious ?? 0 });
  return (
    <View style={styles.section}>
      <Text variant="title" accessibilityRole="header">
        {t('ownerInsights.funnel')}
      </Text>
      <View style={[styles.row, !wide && styles.stack]}>
        {steps.map((step, i) => (
          <View
            key={step.key}
            style={[cardStyle(theme), styles.card]}
            accessible
            accessibilityLabel={`${t(`ownerInsights.step.${step.key}`)}: ${n(step.count)}, ${note(i, step.ofPrevious)}`}
          >
            <Text style={[styles.label, { color: theme.muted }]}>
              {t(`ownerInsights.step.${step.key}`)}
            </Text>
            <Text style={styles.count}>{n(step.count)}</Text>
            <View style={[styles.track, { backgroundColor: theme.wash }]}>
              <View
                style={[styles.fill, { backgroundColor: theme.fill, width: `${step.percent}%` }]}
              />
            </View>
            <Text style={[styles.note, { color: theme.meta }]}>{note(i, step.ofPrevious)}</Text>
          </View>
        ))}
      </View>
      {dropped > 0 ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/owner/menu')}
          style={({ pressed }) => [
            cardStyle(theme),
            styles.tip,
            pressed && { backgroundColor: theme.wash },
          ]}
        >
          <Info size={20} color={theme.ink} />
          {/* Phones stack the link under the sentence, so the sentence keeps the full width. */}
          <View style={[styles.tipWords, !wide && styles.tipStack]}>
            <Text style={styles.tipText}>{t('ownerInsights.dropTip', { count: dropped })}</Text>
            <Text style={styles.link}>{t('ownerInsights.improveMenu')}</Text>
          </View>
          <ChevronRight size={18} color={theme.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space[4] },
  row: { flexDirection: 'row', gap: tokens.space[4] },
  stack: { flexDirection: 'column' },
  card: { flex: 1, minWidth: 0, padding: tokens.owner.controls.cardPadding, gap: 10 },
  label: { fontSize: 15, lineHeight: 20 },
  count: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  note: { fontSize: 14, lineHeight: 20 },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 60,
    paddingLeft: tokens.owner.controls.cardPadding,
    paddingRight: tokens.space[4],
  },
  tipWords: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tipStack: { flexDirection: 'column', alignItems: 'flex-start', gap: 4, paddingVertical: 14 },
  tipText: { flexGrow: 1, flexShrink: 1, fontSize: 15, lineHeight: 22 },
  link: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.strong },
});
