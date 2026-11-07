import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react-native';
import { nextOrderMove, type StaffRole } from '@/features/orders';
import type { FloorTable, Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ModalSheet } from '../../kit';
import { BillLines } from './BillLines';
import { detailActions, type DetailAction } from './detailActions';
import { STATUS_LABEL } from './FloorTile';
import type { FloorActions } from './useFloorActions';

/**
 * One table, opened from its tile: what is owed, any open waiter call, the dishes on the bill,
 * and the next steps. It is a sheet over the floor, so the grid keeps the full page width.
 */
export function TableDetail({
  table,
  bill,
  currency,
  role,
  actions,
  onClose,
}: {
  table: FloorTable;
  bill: Order | null;
  currency: string;
  role: StaffRole;
  actions: FloorActions;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  // One idempotency key per bill and amount while the sheet is open (like MarkPaidSheet), so a
  // retry after a lost response is the same payment to the server. A new amount is a new key.
  const keys = useRef(new Map<string, string>());
  const cashKey = (orderId: string, amount: number): string => {
    const id = `${orderId}:${amount}`;
    const known = keys.current.get(id);
    if (known) return known;
    const fresh = Crypto.randomUUID();
    keys.current.set(id, fresh);
    return fresh;
  };
  // With payments off nothing marks money paid, so the full total is still owed.
  const due = bill
    ? Math.max(0, bill.totalPesewas - (PAYMENTS_ENABLED ? bill.paidPesewas : 0))
    : 0;
  // Worked out once per table, then shared by the label and the tap.
  const step = table.orderStatus ? nextOrderMove(table.orderStatus, role) : null;
  const steps = detailActions(table, { payments: PAYMENTS_ENABLED, hasBill: bill != null, step });
  const subtitle = [
    t(STATUS_LABEL[table.status]),
    table.orderNumber != null ? t('ownerFloor.orderNumber', { number: table.orderNumber }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const label = (item: DetailAction): string => {
    switch (item.id) {
      case 'acknowledge':
        return t('owner.onTheWay');
      case 'resolve':
        // Payments off: resolving a bill request is how a table's bill is closed.
        return !PAYMENTS_ENABLED && table.waiterReason === 'bill'
          ? t('owner.billSettled')
          : t('owner.doneCall');
      case 'cash':
        return t('owner.cash');
      case 'move':
        return t(`ownerOrders.move.${item.move}`);
    }
  };

  const run = (item: DetailAction) => {
    if (item.id === 'acknowledge' && table.waiterCallId) {
      actions.answerCall(table.waiterCallId, 'acknowledged');
    } else if (item.id === 'resolve' && table.waiterCallId) {
      actions.answerCall(table.waiterCallId, 'resolved');
    } else if (item.id === 'cash' && table.orderId) {
      actions.recordCash(table.orderId, due, cashKey(table.orderId, due));
    } else if (item.id === 'move' && table.orderId) {
      actions.moveOrder(table.orderId, item.next);
    }
  };

  const busy = (item: DetailAction) =>
    item.id === 'cash' ? actions.paying : item.id === 'move' ? actions.moving : actions.answering;

  const footer =
    steps.length > 0 ? (
      <View style={styles.actions}>
        {steps.map((item) => (
          <Button
            key={item.id}
            label={label(item)}
            tone={item.tone}
            size="md"
            loading={busy(item)}
            onPress={() => run(item)}
            style={styles.action}
          />
        ))}
      </View>
    ) : undefined;

  return (
    <ModalSheet
      visible
      onClose={onClose}
      title={t('ownerFloor.tableName', { name: table.label ?? table.code })}
      subtitle={subtitle}
      footer={footer}
    >
      {table.billPesewas != null ? (
        <View style={styles.due}>
          <Text variant="caption" style={{ color: theme.muted }}>
            {t('ownerFloor.due')}
          </Text>
          <Text variant="display-m" style={styles.money}>
            {formatMoney(pesewas(due), currency)}
          </Text>
        </View>
      ) : null}

      {table.waiterReason ? (
        <View style={[styles.call, { backgroundColor: theme.errorTint }]}>
          <View style={[styles.edge, { backgroundColor: theme.error }]} />
          <Bell size={20} color={theme.error} />
          <Text variant="body-strong" style={styles.callText}>
            {t('ownerFloor.callNotice', { reason: t(`waiter.reasons.${table.waiterReason}`) })}
          </Text>
        </View>
      ) : null}

      <View style={styles.bill}>
        <Text variant="caption" accessibilityRole="header" style={{ color: theme.muted }}>
          {t('ownerFloor.billHeading')}
        </Text>
        <BillLines lines={bill?.lines ?? []} currency={currency} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  due: { gap: tokens.space[1] },
  money: { fontVariant: ['tabular-nums'] },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget,
    paddingVertical: tokens.space[3],
    paddingLeft: tokens.space[3] + tokens.owner.statusEdge,
    paddingRight: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  // Drawn as its own strip so the rounded corners clip it cleanly on every platform.
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: tokens.owner.statusEdge },
  callText: { flex: 1 },
  bill: { gap: tokens.space[1] },
  actions: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  action: { flexGrow: 1 },
});
