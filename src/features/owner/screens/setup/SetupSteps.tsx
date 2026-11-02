import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export const STEPS = ['venue', 'tables', 'wifi', 'payout'] as const;
export type Step = (typeof STEPS)[number];

/** "Step 2 of 4" with a dot per step: done steps get a tick, so progress is not colour alone. */
export function SetupSteps({ current }: { current: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={t('ownerSetup.progress', { step: current + 1, total: STEPS.length })}
    >
      <View style={styles.row}>
        {STEPS.map((step, index) => {
          const done = index < current;
          const on = index === current;
          return (
            <View key={step} style={styles.item}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done || on ? theme.fill : theme.wash,
                    borderColor: on ? theme.fill : theme.line,
                  },
                ]}
              >
                {done ? (
                  <Check size={14} color={theme.onFill} strokeWidth={3} />
                ) : (
                  <Text
                    variant="caption"
                    style={{ color: on ? theme.onFill : theme.muted, fontFamily: 'Inter_600' }}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                variant="caption"
                numberOfLines={1}
                style={{ color: on ? theme.text : theme.muted }}
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
  wrap: { gap: tokens.space[2] },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { flex: 1, alignItems: 'center', gap: tokens.space[1] },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
