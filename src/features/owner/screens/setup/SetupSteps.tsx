import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { STEPS } from './setupFlow';

const DOT = 28;

/**
 * The four steps as numbered dots joined by a line. Done steps get a tick, so progress never
 * rests on colour alone, and the whole row reads out as "Step 2 of 4, Tables".
 */
export function SetupSteps({ current }: { current: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const name = t(`ownerSetup.steps.${STEPS[current] ?? 'venue'}`);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${t('ownerSetup.progress', { step: current + 1, total: STEPS.length })}, ${name}`}
    >
      {STEPS.map((step, index) => {
        const done = index < current;
        const on = index === current;
        const reached = done || on;
        return (
          <View key={step} style={styles.item}>
            <View style={styles.markRow}>
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor:
                      index === 0 ? 'transparent' : reached ? theme.fill : theme.line,
                  },
                ]}
              />
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: reached ? theme.fill : theme.surface,
                    borderColor: reached ? theme.fill : theme.line,
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
                      index === STEPS.length - 1 ? 'transparent' : done ? theme.fill : theme.line,
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
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', gap: tokens.space[1] },
  markRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  line: { flex: 1, height: 2 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
