import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

export const STEPS = ['venue', 'tables', 'wifi', 'payout'] as const;
export type Step = (typeof STEPS)[number];

/**
 * "Step 2 of 4" with a progress bar, then the steps joined by lines. Done steps get a tick, so
 * progress never rests on colour alone.
 */
export function SetupSteps({ current }: { current: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const share = (current + 1) / STEPS.length;
  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}
      accessible
      accessibilityLabel={t('ownerSetup.progress', { step: current + 1, total: STEPS.length })}
    >
      <View style={styles.top}>
        <Text variant="caption" style={{ color: theme.muted, fontFamily: fontFamily.strong }}>
          {t('ownerSetup.progress', { step: current + 1, total: STEPS.length })}
        </Text>
        <Text variant="caption" style={{ color: theme.ink, fontFamily: fontFamily.strong }}>
          {t(`ownerSetup.steps.${STEPS[current] ?? 'venue'}`)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.wash }]}>
        <View style={[styles.fill, { width: `${share * 100}%`, backgroundColor: theme.fill }]} />
      </View>
      <View style={styles.row}>
        {STEPS.map((step, index) => {
          const done = index < current;
          const on = index === current;
          return (
            <View key={step} style={styles.item}>
              <View style={styles.markRow}>
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor:
                        index === 0 ? 'transparent' : index <= current ? theme.fill : theme.line,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: done || on ? theme.fill : theme.surface,
                      borderColor: done || on ? theme.fill : theme.line,
                    },
                  ]}
                >
                  {done ? (
                    <Check size={14} color={theme.onFill} strokeWidth={3} />
                  ) : (
                    <Text
                      variant="caption"
                      style={{
                        color: on ? theme.onFill : theme.muted,
                        fontFamily: fontFamily.strong,
                      }}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor:
                        index === STEPS.length - 1
                          ? 'transparent'
                          : index < current
                            ? theme.fill
                            : theme.line,
                    },
                  ]}
                />
              </View>
              <Text
                variant="caption"
                numberOfLines={1}
                style={{
                  color: on ? theme.text : theme.muted,
                  fontFamily: on ? fontFamily.strong : undefined,
                }}
              >
                {t(`ownerSetup.steps.${step}`)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[3],
    padding: tokens.space[4],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  row: { flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', gap: tokens.space[1] },
  markRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  line: { flex: 1, height: 2 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
