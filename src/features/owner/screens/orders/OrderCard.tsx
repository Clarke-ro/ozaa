import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MessageSquareText } from 'lucide-react-native';
import type { Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { CodeTile, StatusPill, type PillTone } from '../../kit';
import { ticketAge } from '../../desk/ops';

const STATUS_TONE: Record<Order['status'], PillTone> = {
  received: 'waiting',
  preparing: 'accent',
  ready: 'success',
  served: 'neutral',
  cancelled: 'error',
};

const AGE_TONE = { ok: 'neutral', late: 'waiting', very_late: 'error' } as const;

const PAID_TONE: Record<Order['paymentStatus'], PillTone> = {
  unpaid: 'neutral',
  part_paid: 'waiting',
  paid: 'success',
  refunded: 'neutral',
};

/**
 * One kitchen ticket. Read top to bottom the way the pass does: where it goes and how long it
 * has waited, what to cook (with add-ons and notes), then the money and the one next step.
 */
export function OrderCard({
  order,
  currency,
  now,
  next,
  busy,
  onNext,
}: {
  order: Order;
  currency: string;
  now: number;
  /** The label of the next step for this role, or null when there is none. */
  next: string | null;
  busy: boolean;
  onNext: () => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const live = order.status !== 'served' && order.status !== 'cancelled';
  const age = ticketAge(order.createdAt, now);
  const time = new Date(order.createdAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const where = order.tableCode
    ? t('ownerOrders.table', { code: order.tableCode })
    : t('ownerOrders.takeaway');
  const items = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const edge =
    live && age.tone === 'very_late'
      ? theme.error
      : order.status === 'ready'
        ? theme.success
        : theme.line;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: edge }]}>
      <View style={styles.head}>
        <CodeTile
          code={order.tableCode ?? 'TA'}
          size={52}
          tone={order.status === 'received' ? 'tint' : 'wash'}
        />
        <View style={styles.flex}>
          <Text variant="title" numberOfLines={1}>
            {where}
          </Text>
          <Text variant="caption" style={{ color: theme.muted }}>
            #{order.number} · {time} · {t('ownerOrders.items', { count: items })}
          </Text>
        </View>
        {live ? (
          <View accessibilityLabel={t('ownerOrders.waitedLabel', { count: age.minutes })}>
            <StatusPill
              label={
                age.minutes === 0
                  ? t('ownerOrders.justNow')
                  : age.minutes < 60
                    ? t('ownerOrders.waited', { count: age.minutes })
                    : t('ownerOrders.waitedHours', { count: Math.floor(age.minutes / 60) })
              }
              tone={AGE_TONE[age.tone]}
              boxed
            />
          </View>
        ) : (
          <StatusPill
            label={t(`statusLabel.${order.status}`)}
            tone={STATUS_TONE[order.status]}
            boxed
          />
        )}
      </View>

      <View style={[styles.lines, { borderColor: theme.line }]}>
        {order.lines.map((line) => (
          <View key={line.id} style={styles.line}>
            <View style={[styles.qty, { backgroundColor: theme.wash }]}>
              <Text variant="body-strong" style={styles.num}>
                {line.quantity}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="body-strong">{line.name}</Text>
              {line.modifiers?.length ? (
                <Text variant="caption" style={{ color: theme.muted }}>
                  + {line.modifiers.map((m) => m.name).join(', ')}
                </Text>
              ) : null}
              {line.note ? (
                <View style={[styles.note, { backgroundColor: theme.warningTint }]}>
                  <MessageSquareText size={14} color={theme.text} />
                  <Text variant="caption" style={styles.flex}>
                    {line.note}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.foot}>
        <Text variant="title" style={styles.num}>
          {formatMoney(pesewas(order.totalPesewas), currency)}
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
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[4],
    padding: tokens.space[4],
    borderWidth: 1.5,
    borderRadius: tokens.radius.xl - 4,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  flex: { flex: 1 },
  lines: {
    gap: tokens.space[3],
    paddingTop: tokens.space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] },
  qty: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: tokens.space[2],
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    marginTop: tokens.space[1],
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[1],
    borderRadius: tokens.radius.sm,
    alignSelf: 'flex-start',
  },
  num: { fontVariant: ['tabular-nums'] },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
