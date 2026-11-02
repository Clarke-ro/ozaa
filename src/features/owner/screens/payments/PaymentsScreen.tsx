import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard, Smartphone, Wallet, type LucideIcon } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { VenueTransaction } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { moneyTotals } from '../../desk/ops';
import {
  ChipRow,
  EmptyCard,
  InfoRow,
  LinkRow,
  Section,
  StatTile,
  StatusPill,
  toast,
} from '../../kit';
import { TransactionSheet } from './TransactionSheet';

type Filter = 'all' | VenueTransaction['method'];
const ICON: Record<VenueTransaction['method'], LucideIcon> = {
  momo: Smartphone,
  card: CreditCard,
  cash: Banknote,
};

/** Where the money goes (payout account), what came in, and every payment. */
export function PaymentsScreen() {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const txKey = ['owner-transactions', venueId];
  const txs = useQuery({
    queryKey: txKey,
    queryFn: () => api.ownerListTransactions(venueId),
    enabled: Boolean(venueId),
  });
  const payout = useQuery({
    queryKey: ['owner-payout', venueId],
    queryFn: () => api.ownerGetPayoutAccount(venueId),
    enabled: Boolean(venueId),
  });

  const refund = useMutation({
    mutationFn: (id: string) => api.ownerRefundTransaction(id),
    onSuccess: () => {
      toast.success(t('ownerPayments.refunded'));
      setOpenId(null);
      void client.invalidateQueries({ queryKey: txKey });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const all = [...(txs.data?.items ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const currency = all[0]?.currency ?? 'GHS';
  const money = (v: number) => formatMoney(pesewas(v), currency);
  const totals = moneyTotals(all);
  const shown = filter === 'all' ? all : all.filter((tx) => tx.method === filter);
  const open = all.find((tx) => tx.id === openId);
  const p = payout.data;

  return (
    <OwnerPage title={t('owner.payments')}>
      {p ? (
        <Section
          title={t('ownerPayments.payoutTitle')}
          note={t('ownerPayments.fee', { percent: p.ozaaFeePercent.toLocaleString(i18n.language) })}
        >
          <InfoRow
            icon={Wallet}
            label={p.businessName}
            value={`${t(`ownerPayments.payoutType.${p.settlementType}`)} ${p.accountMasked}`}
            trailing={
              <StatusPill
                label={p.verified ? t('owner.payoutReady') : t('owner.payoutWait')}
                tone={p.verified ? 'success' : 'waiting'}
              />
            }
          />
        </Section>
      ) : null}
      <DeskWait loading={txs.isLoading} error={txs.isError} onRetry={() => void txs.refetch()}>
        <View style={styles.grid}>
          <View style={styles.half}>
            <StatTile label={t('ownerPayments.collected')} value={money(totals.collected)} />
          </View>
          <View style={styles.half}>
            <StatTile
              label={t('ownerPayments.settled')}
              value={money(totals.settled)}
              note={
                totals.refunded
                  ? t('ownerPayments.refundedNote', { amount: money(totals.refunded) })
                  : undefined
              }
            />
          </View>
        </View>
        <ChipRow
          value={filter}
          onChange={setFilter}
          items={(['all', 'momo', 'card', 'cash'] as const).map((id) => ({
            id,
            label: id === 'all' ? t('ownerReviews.all') : t(`ownerPayments.methods.${id}`),
          }))}
        />
        {shown.length === 0 ? (
          <EmptyCard
            icon={Wallet}
            title={t('ownerPayments.empty')}
            description={t('ownerPayments.emptyBody')}
          />
        ) : (
          <Section title={t('ownerPayments.list')}>
            {shown.map((tx) => (
              <LinkRow
                key={tx.id}
                icon={ICON[tx.method]}
                label={t('ownerPayments.orderTitle', { number: tx.orderNumber })}
                value={money(tx.amountPesewas)}
                onPress={() => setOpenId(tx.id)}
                trailing={
                  <StatusPill
                    label={
                      tx.status === 'succeeded'
                        ? t(`ownerPayments.settlement.${tx.settlement}`)
                        : t(`ownerPayments.status.${tx.status}`)
                    }
                    tone={
                      tx.status !== 'succeeded'
                        ? 'error'
                        : tx.settlement === 'settled'
                          ? 'success'
                          : tx.settlement === 'refunded'
                            ? 'neutral'
                            : 'waiting'
                    }
                    icon={false}
                  />
                }
              />
            ))}
          </Section>
        )}
      </DeskWait>
      {open ? (
        <TransactionSheet
          tx={open}
          refunding={refund.isPending}
          onClose={() => setOpenId(null)}
          onRefund={() => refund.mutate(open.id)}
        />
      ) : null}
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  half: { flexBasis: '47%', flexGrow: 1 },
});
