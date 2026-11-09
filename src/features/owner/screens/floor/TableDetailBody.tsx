import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react-native';
import { nextOrderMove, type StaffRole } from '@/features/orders';
import type { FloorTable, Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { amountDue } from '../orders/orderSteps';
import { BillLines } from './BillLines';
import { detailActions, type DetailAction } from './detailActions';
import { STATUS_LABEL } from './floorLook';
import type { FloorActions } from './useFloorActions';

/** The table's name and a short status line, for the panel or sheet title. */
export function useTableTitle(table: FloorTable): { title: string; subtitle: string } {
  const { t } = useTranslation();
  return {
    // The label is already the table's full name ("Table 12"); only a bare code needs "Table".
    title: table.label ?? t('ownerFloor.tableName', { name: table.code }),
    subtitle: [
      t(STATUS_LABEL[table.status]),
      table.orderNumber != null ? t('ownerFloor.orderNumber', { number: table.orderNumber }) : null,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

/**
 * One table's details: what is owed, any open waiter call, the dishes on the bill, and the next
 * steps. Drawn in the side panel on a desktop and in a sheet on smaller screens.
 */
export function TableDetailBody({
  table,
  bill,
  currency,
  role,
  actions,
  onMarkPaid,
}: {
  table: FloorTable;
  bill: Order | null;
  currency: string;
  role: StaffRole;
  actions: FloorActions;
  /** Opens "How did it pay?" for this bill, the same sheet as on Orders. */
  onMarkPaid: (order: Order) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const due = bill ? amountDue(bill) : 0;
  // Worked out once per table, then shared by the label and the tap.
  const step = table.orderStatus ? nextOrderMove(table.orderStatus, role) : null;
  const steps = detailActions(table, { hasBill: bill != null, step });
  const label = (item: DetailAction): string => {
    switch (item.id) {
      case 'acknowledge':
        return t('owner.onTheWay');
      case 'resolve':
        return t('owner.doneCall');
      case 'markPaid':
        return t('ownerOrders.markPaid.open');
      case 'move':
        return t(`ownerOrders.move.${item.move}`);
    }
  };

  const run = (item: DetailAction) => {
    if (item.id === 'acknowledge' && table.waiterCallId) {
      actions.answerCall(table.waiterCallId, 'acknowledged');
    } else if (item.id === 'resolve' && table.waiterCallId) {
      actions.answerCall(table.waiterCallId, 'resolved');
    } else if (item.id === 'markPaid' && bill) {
      onMarkPaid(bill);
    } else if (item.id === 'move' && table.orderId) {
      actions.moveOrder(table.orderId, item.next);
    }
  };

  const busy = (item: DetailAction) =>
    item.id === 'markPaid' ? false : item.id === 'move' ? actions.moving : actions.answering;

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
          />
        ))}
      </View>
    ) : undefined;

  return (
    <View style={styles.stack}>
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
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
});
