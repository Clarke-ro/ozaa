import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { useTheme } from '@/ui/theme';
import { StatusPill, type PillTone } from '../../kit';
import { ticketAge } from '../../desk/ops';
import { OrderCardHead } from './OrderCardHead';
import { OrderContact } from './OrderContact';
import { OrderLines } from './OrderLines';

const PAID_TONE: Record<Order['paymentStatus'], PillTone> = {
  unpaid: 'neutral',
  part_paid: 'waiting',
  paid: 'success',
  refunded: 'neutral',
};

/**
 * One ticket as a row in the orders list. Closed it is one line: where it goes, how long it has
 * waited, how much. Tap to open what to cook, how it was paid and the one next step.
 */
export function OrderRow({
  order,
  currency,
  now,
  first,
  next,
  busy,
  onNext,
  onMarkPaid,
}: {
  order: Order;
  currency: string;
  now: number;
  /** The first row has no line above it. */
  first: boolean;
  /** The label of the next step for this role, or null when there is none. */
  next: string | null;
  busy: boolean;
  onNext: () => void;
  /** Set for staff who may mark orders paid; shown on unpaid tickets only. */
  onMarkPaid?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const live = order.status !== 'served' && order.status !== 'cancelled';
  const age = ticketAge(order.createdAt, now);
  // "Paid online" or "Paid · Cash", so staff know whether money is already in.
  const paidLabel =
    order.paymentStatus === 'paid' && order.paymentMethod
      ? order.paymentMethod.startsWith('online')
        ? t('ownerOrders.paid.online')
        : t('ownerOrders.paid.by', { method: t(`ownerOrders.method.${order.paymentMethod}`) })
      : t(`ownerOrders.paid.${order.paymentStatus}`);
  const canMarkPaid = onMarkPaid && order.paymentStatus !== 'paid' && order.status !== 'cancelled';

  return (
    <View
      style={[
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
        open && { backgroundColor: theme.wash },
      ]}
    >
      <OrderCardHead
        order={order}
        currency={currency}
        age={age}
        live={live}
        open={open}
        onToggle={() => setOpen((v) => !v)}
      />
      {open ? (
        <View style={styles.body}>
          <OrderContact order={order} />
          <OrderLines lines={order.lines} />
          <View style={styles.foot}>
            <StatusPill label={paidLabel} tone={PAID_TONE[order.paymentStatus]} icon={false} />
            <View style={styles.actions}>
              {canMarkPaid ? (
                <Button
                  label={t('ownerOrders.markPaid.open')}
                  size="md"
                  tone="ghost"
                  onPress={onMarkPaid}
                />
              ) : null}
              {next ? (
                // Outlined, not filled: "Create order" in the header is this screen's one filled button.
                <Button label={next} size="md" tone="secondary" loading={busy} onPress={onNext} />
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: tokens.space[4], paddingVertical: tokens.space[2] },
  // Lines up with the text in the head, past the tile.
  body: { gap: tokens.space[3], paddingBottom: tokens.space[2] },
  foot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[2],
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
});
