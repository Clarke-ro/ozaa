import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ticketAge } from '../../desk/ops';
import { CodeTile, StatusPill } from '../../kit';
import { AGE_TONE, orderPlace, waitedLabel } from '../orders/orderPlace';
import { ACTION_WIDTH, TILE, TOTAL_WIDTH } from './ticketCells';

/**
 * One open ticket in the Live orders list, a ruled line on the page: the table code, where it
 * goes with "#number · items · time" under it, then the wait and the total. Wide screens keep it
 * on one line with the next step beside it; phones put the total over the wait and leave the
 * steps to Orders. The step button sits beside the tappable row, never inside it.
 */
export function TicketRow({
  order,
  currency,
  now,
  wide,
  next,
  busy,
  onNext,
  onOpen,
}: {
  order: Order;
  currency: string;
  now: number;
  wide: boolean;
  next: string | null;
  busy: boolean;
  onNext: () => void;
  /** Missing when this person may not open Orders. */
  onOpen?: () => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { where, tile } = orderPlace(order, t);
  const age = ticketAge(order.createdAt, now);
  const count = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const items = t('ownerOrders.items', { count });
  const time = new Date(order.createdAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const total = formatMoney(pesewas(order.totalPesewas), currency);
  // Phones leave the steps to Orders; there is no room for a button beside the row.
  const step = wide ? next : null;
  const waited = t('ownerOrders.waitedLabel', { count: age.minutes });
  const spoken = `${where}, #${order.number}, ${items}, ${waited}, ${total}`;
  const body = (
    <>
      <CodeTile code={tile} size={TILE} tone={age.tone === 'very_late' ? 'alert' : 'wash'} />
      <View style={styles.copy}>
        <Text variant="body-strong" numberOfLines={1}>
          {where}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }} numberOfLines={1}>
          {`#${order.number} · ${items} · ${time}`}
        </Text>
      </View>
      <View style={wide ? styles.endWide : styles.endPhone}>
        <StatusPill label={waitedLabel(age.minutes, t)} tone={AGE_TONE[age.tone]} boxed />
        <Text variant="body-strong" style={[styles.num, wide && styles.total]} numberOfLines={1}>
          {total}
        </Text>
      </View>
    </>
  );

  return (
    <View style={[styles.row, { borderTopColor: theme.line }]}>
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={spoken}
          onPress={onOpen}
          style={({ pressed }) => [
            styles.main,
            step !== null && styles.beforeStep,
            pressed && { backgroundColor: theme.surface },
          ]}
        >
          {body}
        </Pressable>
      ) : (
        <View
          style={[styles.main, step !== null && styles.beforeStep]}
          accessible
          accessibilityLabel={spoken}
        >
          {body}
        </View>
      )}
      {step !== null ? (
        <Button
          label={step}
          tone="secondary"
          size="md"
          loading={busy}
          onPress={onNext}
          style={styles.step}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // Padded and pulled back by the same amount, so the tile lines up with the heading above and
  // the pressed fill still has room around the words.
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget + tokens.space[4],
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[2],
    marginHorizontal: -tokens.space[2],
    borderRadius: tokens.radius.md,
  },
  // With a step button after it, the row keeps its right edge so the gap to the button stays.
  beforeStep: { marginRight: 0 },
  copy: { flex: 1, gap: tokens.space[1] / 2 },
  endWide: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] },
  endPhone: { flexDirection: 'column-reverse', alignItems: 'flex-end', gap: tokens.space[1] },
  num: { fontVariant: ['tabular-nums'] },
  total: { width: TOTAL_WIDTH, textAlign: 'right' },
  step: { width: ACTION_WIDTH },
});
