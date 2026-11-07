import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
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
 * One kitchen ticket. Collapsed it is one row: where it goes, how much, how long it has waited.
 * Tap to open what to cook (add-ons and notes), how it was paid (or Mark paid) and the one next step.
 */
export function OrderCard({
  order,
  currency,
  now,
  next,
  busy,
  onNext,
  onMarkPaid,
}: {
  order: Order;
  currency: string;
  now: number;
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
  // The left edge says what needs eyes first: a late ticket (amber, then red, the same tones as
  // its wait pill), else a new one (venue colour) or one ready to go out (green). Calm tickets
  // have none.
  const edge =
    live && age.tone === 'very_late'
      ? theme.error
      : live && age.tone === 'late'
        ? theme.warning
        : order.status === 'received'
          ? theme.fill
          : order.status === 'ready'
            ? theme.success
            : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      {edge ? <View style={[styles.edge, { backgroundColor: edge }]} /> : null}
      <OrderCardHead
        order={order}
        currency={currency}
        age={age}
        live={live}
        open={open}
        onToggle={() => setOpen((v) => !v)}
      />
      {open ? (
        <>
          <OrderContact order={order} />
          <OrderLines lines={order.lines} />
          <View style={styles.foot}>
            <Text variant="title" style={styles.num}>
              {formatMoney(pesewas(order.totalPesewas), currency)}
            </Text>
            <StatusPill label={paidLabel} tone={PAID_TONE[order.paymentStatus]} icon={false} />
          </View>
          {onMarkPaid && order.paymentStatus !== 'paid' && order.status !== 'cancelled' ? (
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
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Drawn as its own strip so the rounded corners clip it cleanly on every platform.
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: tokens.owner.statusEdge },
  card: {
    overflow: 'hidden',
    gap: tokens.space[4],
    padding: tokens.space[3],
    paddingStart: tokens.space[3] + tokens.owner.statusEdge,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  num: { fontVariant: ['tabular-nums'] },
});
