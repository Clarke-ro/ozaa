import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { StatusPill, TitledSection } from '../../kit';
import { PAID_TONE, paidLabel } from './orderPlace';
import { amountDue } from './orderSteps';

/** How the order was paid, what is still owed, and Mark paid for staff who may take money. */
export function OrderPayment({
  order,
  currency,
  canMarkPaid,
  onMarkPaid,
}: {
  order: Order;
  currency: string;
  canMarkPaid: boolean;
  onMarkPaid: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const due = amountDue(order);
  return (
    <TitledSection title={t('ownerOrders.detail.payment')} cardStyle={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="body">
            {order.paymentMethod
              ? t(`ownerOrders.method.${order.paymentMethod}`)
              : paidLabel(order, t)}
          </Text>
          {order.paymentStatus !== 'paid' && due > 0 && order.status !== 'cancelled' ? (
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerOrders.detail.stillToPay', { amount: formatMoney(pesewas(due), currency) })}
            </Text>
          ) : null}
        </View>
        {canMarkPaid ? (
          <Button
            label={t('ownerOrders.markPaid.open')}
            tone="secondary"
            onPress={onMarkPaid}
            style={styles.short}
          />
        ) : (
          <StatusPill label={paidLabel(order, t)} tone={PAID_TONE[order.paymentStatus]} />
        )}
      </View>
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 2, paddingHorizontal: tokens.owner.controls.cardPadding },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], minHeight: 60 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  short: { minHeight: 40 },
});
