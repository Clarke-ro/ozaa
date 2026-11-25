import { StyleSheet, View } from 'react-native';
import { statusKey } from '@/lib/orderTimeline';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import type { StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { toast, ToneTag } from '../../kit';
import { useNow } from '@/lib/useNow';
import { acceptLeft } from './acceptBy';
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
  // A new Chowdeck order counts down to when Chowdeck would reject it, as on its ticket.
  const deadline = acceptLeft(order, useNow(30_000));
  const printer = usePrintTicket(currency);
  return (
    <View style={styles.head}>
      <View style={styles.row}>
        <ToneTag label={t(statusKey(order))} tone={STAGE_TAG[order.status]} />
        <ToneTag label={paidLabel(order, t)} tone={PAID_TAG[order.paymentStatus]} />
        {deadline ? (
          <ToneTag
            label={
              deadline.kind === 'left'
                ? t('ownerOrders.accept.left', { count: deadline.minutes })
                : t(`ownerOrders.accept.${deadline.kind}`)
            }
            tone={deadline.kind === 'left' ? 'bill' : 'alert'}
          />
        ) : null}
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
