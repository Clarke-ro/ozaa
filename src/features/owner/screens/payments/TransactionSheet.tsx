import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { VenueTransaction } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ConfirmDialog, ModalSheet } from '../../kit';
import { canRefund } from '../../desk/ops';

/** Details of one payment, with Refund only when it can actually be refunded. */
export function TransactionSheet({
  tx,
  onClose,
  onRefund,
  refunding,
}: {
  tx: VenueTransaction;
  onClose: () => void;
  onRefund: () => void;
  refunding: boolean;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [confirm, setConfirm] = useState(false);
  const amount = formatMoney(pesewas(tx.amountPesewas), tx.currency);
  const rows: [string, string][] = [
    [t('ownerPayments.amount'), amount],
    [
      t('ownerPayments.method'),
      t(`ownerPayments.methods.${tx.method}`) +
        (tx.provider ? ` · ${t(`ownerPayments.providers.${tx.provider}`)}` : ''),
    ],
    [t('ownerPayments.payment'), t(`ownerPayments.status.${tx.status}`)],
    [t('ownerPayments.payout'), t(`ownerPayments.settlement.${tx.settlement}`)],
    [
      t('ownerPayments.when'),
      new Date(tx.createdAt).toLocaleString(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    ],
    [t('ownerPayments.reference'), tx.reference],
  ];
  return (
    <ModalSheet
      visible
      onClose={onClose}
      title={t('ownerPayments.orderTitle', { number: tx.orderNumber })}
      subtitle={tx.testMode ? t('ownerPayments.test') : undefined}
    >
      <View style={[styles.table, { borderColor: theme.line }]}>
        {rows.map(([label, value], index) => (
          <View
            key={label}
            style={[
              styles.row,
              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
            ]}
          >
            <Text variant="body" style={[styles.label, { color: theme.muted }]}>
              {label}
            </Text>
            <Text variant="body-strong" selectable style={styles.value}>
              {value}
            </Text>
          </View>
        ))}
      </View>
      {canRefund(tx) ? (
        <Button
          label={t('ownerPayments.refund', { amount })}
          tone="secondary"
          loading={refunding}
          onPress={() => setConfirm(true)}
        />
      ) : null}
      <ConfirmDialog
        visible={confirm}
        destructive
        title={t('ownerPayments.refundTitle', { amount })}
        message={t('ownerPayments.refundBody')}
        confirmLabel={t('ownerPayments.refundConfirm')}
        loading={refunding}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onRefund();
        }}
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[4],
  },
  row: {
    flexDirection: 'row',
    gap: tokens.space[3],
    minHeight: 44,
    alignItems: 'center',
    paddingVertical: tokens.space[2],
  },
  label: { width: 96 },
  value: { flex: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
