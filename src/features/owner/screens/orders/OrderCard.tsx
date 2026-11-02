import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { CodeTile, StatusPill, type PillTone } from '../../kit';

const TONE: Record<Order['status'], PillTone> = {
  received: 'waiting',
  preparing: 'accent',
  ready: 'success',
  served: 'neutral',
  cancelled: 'error',
};

const PAID_TONE: Record<Order['paymentStatus'], PillTone> = {
  unpaid: 'neutral',
  part_paid: 'waiting',
  paid: 'success',
  refunded: 'neutral',
};

/** One kitchen ticket: table, number, age, lines, total, payment, and the next step as one button. */
export function OrderCard({
  order,
  currency,
  next,
  busy,
  onNext,
}: {
  order: Order;
  currency: string;
  /** The label of the next step for this role, or null when there is none. */
  next: string | null;
  busy: boolean;
  onNext: () => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const money = (v: number) => formatMoney(pesewas(v), currency);
  const time = new Date(order.createdAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: order.status === 'ready' ? theme.success : theme.line,
        },
      ]}
    >
      <View style={styles.head}>
        <CodeTile
          code={order.tableCode ? `T${order.tableCode}` : 'TA'}
          size={44}
          tone={order.status === 'received' ? 'tint' : 'wash'}
        />
        <View style={styles.flex}>
          <Text variant="title">#{order.number}</Text>
          <Text variant="caption" style={{ color: theme.muted }}>
            {order.tableCode
              ? t('ownerOrders.table', { code: order.tableCode })
              : t('ownerOrders.takeaway')}{' '}
            · {time}
          </Text>
        </View>
        <StatusPill label={t(`statusLabel.${order.status}`)} tone={TONE[order.status]} boxed />
      </View>
      <View style={[styles.lines, { borderColor: theme.line }]}>
        {order.lines.map((line) => (
          <View key={line.id} style={styles.line}>
            <Text variant="body-strong" style={styles.qty}>
              {line.quantity}×
            </Text>
            <Text variant="body" style={styles.flex}>
              {line.name}
            </Text>
            <Text variant="caption" style={[styles.num, { color: theme.muted }]}>
              {money(line.totalPesewas)}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.foot}>
        <View style={styles.flex}>
          <Text variant="title" style={styles.num}>
            {money(order.totalPesewas)}
          </Text>
          <StatusPill
            label={t(`ownerOrders.paid.${order.paymentStatus}`)}
            tone={PAID_TONE[order.paymentStatus]}
            icon={false}
          />
        </View>
        {next ? (
          <Button label={next} size="md" tone="secondary" loading={busy} onPress={onNext} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[3],
    padding: tokens.space[4],
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  flex: { flex: 1 },
  lines: {
    gap: tokens.space[2],
    paddingVertical: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[2] },
  qty: { minWidth: 28 },
  num: { fontVariant: ['tabular-nums'] },
  foot: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
});
