import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  BellRing,
  Check,
  ChefHat,
  ClipboardCheck,
  Utensils,
  type LucideIcon,
} from 'lucide-react-native';
import type { Order } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

const STEPS = ['received', 'preparing', 'ready', 'served'] as const;
const ICON: Record<(typeof STEPS)[number], LucideIcon> = {
  received: ClipboardCheck,
  preparing: ChefHat,
  ready: BellRing,
  served: Utensils,
};
const MARK = 36;

/**
 * The order's four steps top to bottom, joined by a line that fills as the kitchen goes.
 * Done steps get a tick, the current one its icon in the venue colour, later ones stay grey.
 * Real times show where the API has them (sent, ready); nothing is guessed.
 */
export function StatusTimeline({
  order,
}: {
  order: Pick<Order, 'status' | 'createdAt' | 'readyAt'>;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const current = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const clock = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
      : null;
  const when: Partial<Record<(typeof STEPS)[number], string | null>> = {
    received: clock(order.createdAt),
    ready: clock(order.readyAt),
  };

  return (
    <View accessibilityRole="list">
      {STEPS.map((step, index) => {
        const done = index < current;
        const on = index === current;
        const Icon = ICON[step];
        const last = index === STEPS.length - 1;
        return (
          <View key={step} style={styles.step} accessible aria-selected={on}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.mark,
                  {
                    backgroundColor: done ? theme.fill : on ? theme.tint : theme.surface,
                    borderColor: done || on ? theme.fill : theme.line,
                  },
                ]}
              >
                {done ? (
                  <Check size={18} color={theme.onFill} strokeWidth={3} />
                ) : (
                  <Icon size={18} color={on ? theme.ink : theme.meta} />
                )}
              </View>
              {last ? null : (
                <View style={[styles.line, { backgroundColor: done ? theme.fill : theme.line }]} />
              )}
            </View>
            <View style={styles.copy}>
              <Text
                variant="body-strong"
                style={{
                  color: done || on ? theme.text : theme.meta,
                  fontFamily: on ? fontFamily.strong : undefined,
                }}
              >
                {t(`status.${step}`)}
              </Text>
              {when[step] && (done || on) ? (
                <Text variant="caption" style={{ color: theme.muted }}>
                  {when[step]}
                </Text>
              ) : on && step === 'ready' ? (
                <Text variant="caption" style={{ color: theme.muted }}>
                  {t('status.readyHint')}
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
  rail: { alignItems: 'center', width: MARK },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { width: 2, flex: 1, minHeight: tokens.space[5] },
  copy: { flex: 1, gap: 2, paddingTop: tokens.space[2], paddingBottom: tokens.space[4] },
});
