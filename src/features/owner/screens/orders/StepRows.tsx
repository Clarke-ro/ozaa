import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { OrderStep } from './orderSteps';

/** The canvas timeline: one row a stage, with its time on the right or "Not yet". */
export function StepRows({ steps, firstNote }: { steps: OrderStep[]; firstNote?: string }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const clock = (at: string) =>
    new Date(at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  return (
    <View>
      {steps.map((step, i) => {
        const done = step.state === 'done';
        return (
          <View
            key={step.id}
            style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}
          >
            <View style={styles.flex}>
              <Text
                variant="body"
                style={{ color: step.id === 'cancelled' ? theme.error : theme.text }}
              >
                {t(`ownerOrders.detail.step.${step.id}`)}
              </Text>
              {i === 0 && firstNote ? (
                <Text variant="caption" style={{ color: theme.muted }}>
                  {firstNote}
                </Text>
              ) : null}
            </View>
            <Text variant="caption" style={{ color: done ? theme.text : theme.meta }}>
              {step.at ? clock(step.at) : done ? '' : t('ownerOrders.detail.notYet')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 56,
    paddingVertical: tokens.space[2],
  },
  flex: { flex: 1, minWidth: 0, gap: 2 },
});
