import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { api } from '@/lib/api';
import type { VenueTransaction } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';

function settlementLabel(item: VenueTransaction, t: (key: string) => string): string {
  if (item.settlement === 'refunded') return t('owner.refunded');
  if (item.settlement === 'pending') return t('owner.pendingSettle');
  if (item.status !== 'succeeded') return t('owner.failedPay');
  return t('owner.settled');
}

export function PaymentsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const rows = useQuery({
    queryKey: ['owner-transactions', venueId],
    queryFn: () => api.ownerListTransactions(venueId),
    enabled: Boolean(venueId),
  });
  const payout = useQuery({
    queryKey: ['owner-payout', venueId],
    queryFn: () => api.ownerGetPayoutAccount(venueId),
    enabled: Boolean(venueId),
  });
  const refund = useMutation({
    mutationFn: (id: string) => api.ownerRefundTransaction(id, { idempotencyKey: Crypto.randomUUID() }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-transactions', venueId] }),
  });

  return (
    <OwnerPage title={t('owner.payments')}>
      <DeskWait loading={rows.isLoading} error={rows.isError} onRetry={() => void rows.refetch()}>
        {payout.data ? (
          <Text variant="body">
            {t('owner.payoutLine', {
              account: payout.data.accountMasked,
              status: payout.data.verified ? t('owner.payoutReady') : t('owner.payoutWait'),
            })}
          </Text>
        ) : null}
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('owner.testPayment')}
        </Text>
        {(rows.data?.items ?? []).map((item) => (
          <View key={item.id} style={[styles.row, { borderColor: theme.line }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="body-strong" style={{ fontVariant: ['tabular-nums'] }}>
                {formatMoney(pesewas(item.amountPesewas), item.currency)}
              </Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                #{item.orderNumber} · {item.method.toUpperCase()} · {settlementLabel(item, t)}
              </Text>
            </View>
            {item.status === 'succeeded' && item.settlement !== 'refunded' ? (
              <Button label={t('owner.refund')} tone="secondary" onPress={() => refund.mutate(item.id)} loading={refund.isPending} />
            ) : null}
          </View>
        ))}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], borderBottomWidth: 1, paddingVertical: tokens.space[3] },
});
