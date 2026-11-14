import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MessageSquareText } from 'lucide-react-native';
import type { Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { amountDue } from './orderSteps';

/**
 * Every dish on an order with its price, add-ons and the guest's note, then the sums the server
 * worked out: subtotal, sale savings, taxes, delivery, total, paid and still to pay. Nothing here
 * is added up on the phone; the server total wins (AGENTS.md, money rules).
 */
export function OrderBill({
  order,
  currency,
  part = 'all',
}: {
  order: Order;
  currency: string;
  /** The canvas shows the dishes and the sums as two cards; 'all' keeps them together. */
  part?: 'all' | 'lines' | 'sums';
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = (amount: number) => formatMoney(pesewas(amount), currency);
  const saved = order.lines.reduce((sum, line) => sum + (line.discountPesewas ?? 0), 0);
  const due = amountDue(order);

  return (
    <View>
      {part !== 'sums' &&
        order.lines.map((line, index) => (
          <View
            key={line.id}
            style={[
              styles.line,
              index > 0 && { borderTopColor: theme.line, borderTopWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <Text variant="body-strong" style={[styles.qty, styles.num]}>
              {line.quantity}×
            </Text>
            <View style={styles.flex}>
              <Text variant="body-strong">{line.name}</Text>
              <Text variant="caption" style={{ color: theme.muted }}>
                {t('ownerOrders.detail.each', { price: money(line.unitPricePesewas) })}
              </Text>
              {line.modifiers?.map((m) => (
                <Text key={m.name} variant="caption" style={{ color: theme.muted }}>
                  {m.pricePesewas > 0
                    ? t('ownerOrders.detail.addOnPriced', {
                        name: m.name,
                        price: money(m.pricePesewas),
                      })
                    : t('ownerOrders.detail.addOn', { name: m.name })}
                </Text>
              ))}
              {line.note ? (
                <View style={[styles.note, { backgroundColor: theme.warningTint }]}>
                  <MessageSquareText size={14} color={theme.text} />
                  <Text variant="caption" style={styles.shrink}>
                    {line.note}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="body" style={styles.num}>
              {money(line.totalPesewas)}
            </Text>
          </View>
        ))}

      {part === 'lines' ? null : (
        <View style={[styles.sums, part === 'all' && styles.ruled, { borderTopColor: theme.line }]}>
          <Sum label={t('ownerOrders.detail.subtotal')} value={money(order.subtotalPesewas)} />
          {saved > 0 ? (
            <Sum
              label={t('ownerOrders.detail.saved')}
              value={t('ownerOrders.detail.minus', { amount: money(saved) })}
            />
          ) : null}
          {order.taxes.map((tax) => (
            <Sum key={tax.code} label={tax.label} value={money(tax.amountPesewas)} />
          ))}
          {order.deliveryFeePesewas ? (
            <Sum label={t('ownerOrders.detail.delivery')} value={money(order.deliveryFeePesewas)} />
          ) : null}
          <Sum label={t('ownerOrders.detail.total')} value={money(order.totalPesewas)} strong />
          {order.paidPesewas > 0 ? (
            <Sum label={t('ownerOrders.detail.paidSoFar')} value={money(order.paidPesewas)} />
          ) : null}
          {due > 0 && order.status !== 'cancelled' ? (
            <Sum label={t('ownerOrders.detail.due')} value={money(due)} strong />
          ) : null}
        </View>
      )}
    </View>
  );
}

function Sum({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const theme = useTheme();
  const variant = strong ? 'body-strong' : 'body';
  return (
    <View style={styles.sum}>
      <Text variant={variant} style={{ color: strong ? theme.text : theme.muted }}>
        {label}
      </Text>
      <Text variant={variant} style={styles.num}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  // A fixed column, so the dish names line up under each other.
  qty: { minWidth: tokens.space[8] },
  flex: { flex: 1, gap: 2 },
  shrink: { flexShrink: 1 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: tokens.space[1],
    marginTop: tokens.space[1],
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[1],
    borderRadius: tokens.radius.sm,
  },
  sums: { gap: tokens.space[2] },
  ruled: { paddingTop: tokens.space[3], borderTopWidth: StyleSheet.hairlineWidth },
  sum: { flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space[3] },
  num: { fontVariant: ['tabular-nums'] },
});
