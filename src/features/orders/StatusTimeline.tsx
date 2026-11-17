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
import { finishWord, TIMELINE, timelineSteps } from '@/lib/orderTimeline';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

const STEPS = TIMELINE;
const ICON: Record<(typeof STEPS)[number], LucideIcon> = {
  accepted: ClipboardCheck,
  preparing: ChefHat,
  ready: BellRing,
  served: Utensils,
};
const MARK = 36;

/**
 * The order's four steps top to bottom, joined by a line that fills as the kitchen goes.
 * A step is ticked as soon as staff mark it; the next one shows its icon in the venue colour;
 * later ones stay grey. The last step reads Served, Picked up or Delivered (finishWord).
 * Until staff accept a new order, the first step reads "Waiting for the restaurant to accept"
 * with the time it was sent. Real times show where the API has them (sent, ready); nothing is guessed.
 */
export function StatusTimeline({
  order,
}: {
  order: Pick<Order, 'status' | 'createdAt' | 'readyAt' | 'source'>;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const states = timelineSteps(order.status);
  // A new order (received) has reached no step yet: the first one reads as waiting.
  const waiting = order.status === 'received';
  const finish = finishWord(order.source);
  const clock = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
      : null;
  const sent = clock(order.createdAt);
  const when: Partial<Record<(typeof STEPS)[number], string | null>> = {
    accepted: waiting && sent ? t('status.sentAt', { time: sent }) : null,
    ready: clock(order.readyAt),
  };

  return (
    <View accessibilityRole="list">
      {STEPS.map((step, index) => {
        const done = states[index] === 'done';
        const on = states[index] === 'next';
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
                  fontFamily: done ? fontFamily.strong : undefined,
                }}
              >
                {t(
                  waiting && step === 'accepted'
                    ? 'status.waiting'
                    : step === 'served'
                      ? `status.${finish}`
                      : `status.${step}`,
                )}
              </Text>
              {when[step] && (done || on) ? (
                <Text variant="caption" style={{ color: theme.muted }}>
                  {when[step]}
                </Text>
              ) : done && step === 'ready' && order.status === 'ready' && finish === 'served' ? (
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
