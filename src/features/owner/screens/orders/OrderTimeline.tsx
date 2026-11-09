import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { OrderStep } from './orderSteps';

const DOT = tokens.space[6];

/**
 * Where an order is, as a short vertical timeline: a tick for each stage it has passed (with its
 * time when the contract keeps one), a ring for the stage it is waiting on, grey for the rest.
 */
export function OrderTimeline({ steps }: { steps: OrderStep[] }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const clock = (at: string) =>
    new Date(at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  return (
    <View>
      {steps.map((step, index) => {
        const done = step.state === 'done';
        const current = step.state === 'current';
        const stop = step.id === 'cancelled';
        const dotColor = stop ? theme.error : done ? theme.success : 'transparent';
        return (
          <View key={step.id} style={styles.step}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: dotColor,
                    borderColor: done ? dotColor : current ? theme.fill : theme.line,
                  },
                ]}
              >
                {done ? <Check size={14} color={theme.white} strokeWidth={3} /> : null}
              </View>
              {index < steps.length - 1 ? (
                <View
                  style={[styles.link, { backgroundColor: done ? theme.success : theme.line }]}
                />
              ) : null}
            </View>
            <View style={styles.words}>
              <Text
                variant={current ? 'body-strong' : 'body'}
                style={{ color: done || current ? theme.text : theme.meta }}
              >
                {t(`statusLabel.${step.id}`)}
              </Text>
              {step.at ? (
                <Text variant="caption" style={{ color: theme.muted }}>
                  {clock(step.at)}
                </Text>
              ) : current ? (
                <Text variant="caption" style={{ color: theme.muted }}>
                  {t('ownerOrders.detail.next')}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: tokens.space[3] },
  rail: { alignItems: 'center', width: DOT },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The line between two dots grows with the text beside it.
  link: { flex: 1, width: 2, minHeight: tokens.space[4] },
  words: { flex: 1, paddingBottom: tokens.space[4], gap: 2 },
});
