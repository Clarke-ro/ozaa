import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react-native';
import type { InsightsReport } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { InsightSection } from './InsightSection';
import { funnelSteps, menuDropOff } from './insightsModel';

/**
 * "From scan to order" (design canvas): each step's number in big type with a thick bar, its
 * share of the step before on the right, and a tip about guests who opened the menu but left.
 */
export function FunnelCard({ report: r }: { report: InsightsReport }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const steps = funnelSteps(r);
  const dropped = menuDropOff(r);
  const n = (v: number) => v.toLocaleString(i18n.language);
  return (
    <InsightSection title={t('ownerInsights.funnel')} cardStyle={styles.card}>
      {steps[0].count === 0 ? (
        <Text variant="body" style={{ color: theme.muted }}>
          {t('ownerInsights.noVisits')}
        </Text>
      ) : (
        <>
          {steps.map((step, i) => (
            <View
              key={step.key}
              style={styles.step}
              accessible
              accessibilityLabel={`${n(step.count)} ${t(`ownerInsights.stepLower.${step.key}`)}`}
            >
              <View style={styles.line}>
                <Text style={styles.count}>{n(step.count)}</Text>
                <Text style={[styles.label, { color: theme.muted }]}>
                  {t(`ownerInsights.stepLower.${step.key}`)}
                </Text>
                {step.ofPrevious != null ? (
                  <Text style={[styles.share, { color: theme.meta }]}>
                    {t(`ownerInsights.ofPrevious.${i === 1 ? 'scans' : 'views'}`, {
                      percent: step.ofPrevious,
                    })}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.track, { backgroundColor: theme.tint }]}>
                <View
                  style={[styles.fill, { backgroundColor: theme.fill, width: `${step.percent}%` }]}
                />
              </View>
            </View>
          ))}
          {dropped > 0 ? (
            <View style={[styles.tip, { borderTopColor: theme.wash }]}>
              <Info size={18} color={theme.ink} />
              <Text style={styles.tipText}>{t('ownerInsights.dropTip', { count: dropped })}</Text>
            </View>
          ) : null}
        </>
      )}
    </InsightSection>
  );
}

const styles = StyleSheet.create({
  card: { gap: 22 },
  step: { gap: 10 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  count: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
  label: { fontSize: 16, lineHeight: 22 },
  share: { marginLeft: 'auto', fontSize: 14, lineHeight: 20 },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: tokens.space[4],
    borderTopWidth: 1,
  },
  tipText: { flex: 1, fontSize: 15, lineHeight: 22 },
});
