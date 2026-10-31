import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react-native';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { ChipRow, DeskCard, IconTile, SectionLabel, StatTile, StatusPill } from '../kit';

type FilterMethod = 'all' | 'momo' | 'card' | 'cash';

export function PaymentsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  const [filter, setFilter] = useState<FilterMethod>('all');

  const rows = useQuery({
    queryKey: ['owner-transactions', venueId],
    queryFn: () => api.ownerListTransactions(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });

  const payout = useQuery({
    queryKey: ['owner-payout', venueId],
    queryFn: () => api.ownerGetPayoutAccount(venueId),
    enabled: Boolean(venueId),
  });

  const refund = useMutation({
    mutationFn: (id: string) =>
      api.ownerRefundTransaction(id, { idempotencyKey: Crypto.randomUUID() }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-transactions', venueId] }),
  });

  const items = rows.data?.items ?? [];
  const currency = items[0]?.currency ?? 'GHS';

  const totalCollected = items
    .filter((i) => i.status === 'succeeded' && i.settlement !== 'refunded')
    .reduce((sum, i) => sum + i.amountPesewas, 0);

  const totalSettled = items
    .filter((i) => i.settlement === 'settled')
    .reduce((sum, i) => sum + i.amountPesewas, 0);

  const totalPending = items
    .filter((i) => i.settlement === 'pending')
    .reduce((sum, i) => sum + i.amountPesewas, 0);

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.method === filter;
  });

  const filterChips = [
    { id: 'all' as const, label: `All (${items.length})` },
    { id: 'momo' as const, label: 'MoMo' },
    { id: 'card' as const, label: 'Card' },
    { id: 'cash' as const, label: 'Cash' },
  ];

  return (
    <OwnerPage
      title={t('owner.payments')}
      subtitle="Direct Paystack settlement to your venue subaccount. Ozaa never holds guest funds."
    >
      <DeskWait loading={rows.isLoading} error={rows.isError} onRetry={() => void rows.refetch()}>
        <View style={styles.stack}>
          {/* Payout Account Card */}
          {payout.data ? (
            <DeskCard style={styles.payoutCard}>
              <View style={styles.payoutHeader}>
                <IconTile icon={Wallet} tone="tint" size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body-strong">{payout.data.businessName}</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Settlement: {payout.data.settlementType.toUpperCase()} ·{' '}
                    {payout.data.accountMasked}
                  </Text>
                </View>
                <StatusPill
                  label={payout.data.verified ? 'Verified' : 'Pending'}
                  tone={payout.data.verified ? 'success' : 'waiting'}
                  boxed
                  icon={payout.data.verified}
                />
              </View>
              <Text variant="caption" style={{ color: theme.meta }}>
                {t('owner.testPayment')} · Automatic daily payouts with 0% Ozaa holding fee.
              </Text>
            </DeskCard>
          ) : null}

          {/* Overview Metrics */}
          <View style={styles.tilesRow}>
            <StatTile label="Collected" value={formatMoney(pesewas(totalCollected), currency)} />
            <StatTile label="Settled" value={formatMoney(pesewas(totalSettled), currency)} />
            <StatTile label="Pending" value={formatMoney(pesewas(totalPending), currency)} />
          </View>

          {/* Filter Chips */}
          <SectionLabel title="Transactions" />
          <ChipRow items={filterChips} value={filter} onChange={setFilter} />

          {/* Transactions List */}
          <DeskCard style={styles.transactionsCard}>
            {filteredItems.length === 0 ? (
              <Text variant="body" style={{ color: theme.muted, paddingVertical: tokens.space[2] }}>
                No transactions matching this filter.
              </Text>
            ) : null}

            {filteredItems.map((item, idx) => {
              const isLast = idx === filteredItems.length - 1;
              const MethodIcon =
                item.method === 'card'
                  ? CreditCard
                  : item.method === 'cash'
                    ? Banknote
                    : Smartphone;

              const isRefunded = item.settlement === 'refunded';
              const isSettled = item.settlement === 'settled';

              return (
                <View
                  key={item.id}
                  style={[
                    styles.txRow,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: theme.line },
                  ]}
                >
                  <IconTile
                    icon={MethodIcon}
                    size={44}
                    tone={isRefunded ? 'wash' : 'tint'}
                  />

                  <View style={styles.txInfo}>
                    <Text variant="body-strong">Order #{item.orderNumber}</Text>
                    <View style={styles.txMeta}>
                      <Text variant="caption" style={{ color: theme.meta }}>
                        {item.method.toUpperCase()}
                      </Text>
                      <Text variant="caption" style={{ color: theme.meta }}>
                        ·
                      </Text>
                      <StatusPill
                        label={
                          isRefunded
                            ? t('owner.refunded')
                            : isSettled
                              ? t('owner.settled')
                              : t('owner.pendingSettle')
                        }
                        tone={isRefunded ? 'error' : isSettled ? 'success' : 'waiting'}
                        icon={!isRefunded}
                      />
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <Text
                      variant="body-strong"
                      style={[
                        styles.txAmount,
                        isRefunded && { textDecorationLine: 'line-through', color: theme.meta },
                        { fontVariant: ['tabular-nums'] },
                      ]}
                    >
                      {formatMoney(pesewas(item.amountPesewas), item.currency)}
                    </Text>

                    {item.status === 'succeeded' && !isRefunded ? (
                      <Button
                        label={t('owner.refund')}
                        tone="secondary"
                        onPress={() => refund.mutate(item.id)}
                        loading={refund.isPending}
                        style={styles.refundBtn}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </DeskCard>
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  payoutCard: { gap: tokens.space[3] },
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  tilesRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  transactionsCard: {
    paddingVertical: tokens.space[1],
    paddingHorizontal: tokens.space[4],
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  txInfo: {
    flex: 1,
    gap: 3,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
  },
  txRight: {
    alignItems: 'flex-end',
    gap: tokens.space[1],
  },
  txAmount: {
    fontSize: 16,
  },
  refundBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
  },
});
