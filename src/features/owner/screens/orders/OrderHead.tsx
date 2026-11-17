import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import type { StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { toast, ToneTag } from '../../kit';
import { paidLabel } from './orderPlace';
import { canPrint } from './orderTicket';
import { usePrintTicket } from './usePrintTicket';

// Canvas tag colours: new orange, cooking blue, ready and served green; paid green, owed amber.
const STAGE_TAG: Record<Order['status'], StatusTone> = {
  received: 'order',
  accepted: 'order',
  preparing: 'info',
  ready: 'success',
  served: 'success',
  cancelled: 'alert',
};
const PAID_TAG: Record<Order['paymentStatus'], StatusTone> = {
  unpaid: 'bill',
  part_paid: 'bill',
  paid: 'success',
  refunded: 'alert',
};

/** The order's kitchen and payment tags, then Print (web) and the next kitchen step. */
export function OrderHead({
  order,
  next,
  busy,
  onNext,
  currency,
}: {
  order: Order;
  next: string | null;
  busy: boolean;
  onNext: () => void;
  currency: string;
}) {
  const { t } = useTranslation();
  const printer = usePrintTicket(currency);
  return (
    <View style={styles.head}>
      <View style={styles.row}>
        <ToneTag label={t(`statusLabel.${order.status}`)} tone={STAGE_TAG[order.status]} />
        <ToneTag label={paidLabel(order, t)} tone={PAID_TAG[order.paymentStatus]} />
      </View>
      <View style={styles.row}>
        {printer.available && canPrint(order) ? (
          <Button
            label={t('ownerOrders.print.button')}
            tone="secondary"
            onPress={() => {
              if (printer.print(order) === false) toast.error(t('ownerOrders.print.blocked'));
            }}
            style={styles.short}
          />
        ) : null}
        {next ? <Button label={next} loading={busy} onPress={onNext} style={styles.short} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  short: { minHeight: 40 },
});
