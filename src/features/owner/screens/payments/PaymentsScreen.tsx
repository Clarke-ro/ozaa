import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Wallet } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { VenueTransaction } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { moneyTotals } from '../../desk/ops';
import { ChipRow, EmptyCard, SectionLabel, StatusPill, toast } from '../../kit';
import { SummaryStrip } from '../../kit/SummaryStrip';
import { TransactionRow } from './TransactionRow';
import { TransactionSheet } from './TransactionSheet';

type Filter = 'all' | VenueTransaction['method'];

/** What came in, where it goes (payout account), and every payment. */
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

  const theme = useTheme();
  const all = [...(txs.data?.items ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const currency = all[0]?.currency ?? DEFAULT_CURRENCY;
  const money = (v: number) => formatMoney(pesewas(v), currency);
  const totals = moneyTotals(all);
  const shown = filter === 'all' ? all : all.filter((tx) => tx.method === filter);
  const open = all.find((tx) => tx.id === openId);
  const p = payout.data;

  return (
    <OwnerPage title={t('owner.payments')}>
      <DeskWait loading={txs.isLoading} error={txs.isError} onRetry={() => void txs.refetch()}>
        {/* Money in: the total on its own line so it never gets cut off. */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text variant="caption" style={{ color: theme.muted }}>
            {t('ownerPayments.collected')}
          </Text>
          <Text variant="display-m" numberOfLines={1} adjustsFontSizeToFit style={styles.num}>
            {money(totals.collected)}
          </Text>
        </View>
        <SummaryStrip
          items={[
            { label: t('ownerPayments.settled'), value: money(totals.settled) },
            { label: t('ownerPayments.waiting'), value: money(totals.collected - totals.settled) },
            { label: t('ownerPayments.refundedShort'), value: money(totals.refunded) },
          ]}
        />

        {p ? (
          <View style={styles.block}>
            <SectionLabel title={t('ownerPayments.payoutTitle')} caps />
            <View
              style={[
                styles.card,
                styles.payout,
                { backgroundColor: theme.surface, borderColor: theme.line },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: theme.tint }]}>
                <Wallet size={20} color={theme.ink} />
              </View>
              <View style={styles.flex}>
                <Text variant="body-strong" numberOfLines={1}>
                  {p.businessName}
                </Text>
                <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
                  {t(`ownerPayments.payoutType.${p.settlementType}`)} {p.accountMasked}
                </Text>
              </View>
              <StatusPill
                label={p.verified ? t('owner.payoutReady') : t('owner.payoutWait')}
                tone={p.verified ? 'success' : 'waiting'}
              />
            </View>
            <Text variant="caption" style={{ color: theme.meta }}>
              {t('ownerPayments.fee', { percent: p.ozaaFeePercent.toLocaleString(i18n.language) })}
            </Text>
          </View>
        ) : null}

        <View style={styles.block}>
          <SectionLabel title={t('ownerPayments.list')} caps />
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
            <View
              style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.line }]}
            >
              {shown.map((tx, index) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  amount={money(tx.amountPesewas)}
                  first={index === 0}
                  onPress={() => setOpenId(tx.id)}
                />
              ))}
            </View>
          )}
        </View>
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
  block: { gap: tokens.space[2] },
  card: {
    gap: tokens.space[1],
    padding: tokens.space[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  payout: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  icon: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
  num: { fontVariant: ['tabular-nums'] },
  list: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
});
