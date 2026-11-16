import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Receipt } from 'lucide-react-native';
import { api } from '@/lib/api';
import { guestKeys } from '@/lib/queryKeys';
import { useVenue } from '@/features/venue';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { PriceText } from '@/ui/PriceText';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { useTheme } from '@/ui/theme';
import { PAY_METHODS } from './PayMethods';
import { payStyles } from './payStyles';
import { receiptFigures } from './receiptFigures';

/**
 * The guest's receipt for one payment: the bill, tax lines once E-VAT is on, their share, tip and
 * what they paid. Only a succeeded payment gets one. Test payments say so at the top.
 */
export function ReceiptScreen({ slug, reference }: { slug: string; reference: string }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const venue = useVenue(slug);
  const payment = useQuery({
    queryKey: guestKeys.payment(reference),
    queryFn: () => api.getPayment(reference),
    enabled: Boolean(reference),
  });
  const orderId = payment.data?.orderId ?? null;
  const order = useQuery({
    queryKey: guestKeys.order(orderId),
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
  });

  if (payment.isLoading || order.isLoading) return <LoadingState />;
  if (payment.isError || order.isError)
    return (
      <ErrorState
        onRetry={() => {
          void payment.refetch();
          void order.refetch();
        }}
      />
    );

  const p = payment.data;
  const o = order.data;
  const back = () => router.push(`/${slug}/status`);
  if (!p || !o || p.status !== 'succeeded') {
    return (
      <SafeScreen>
        <PageHeader title={t('receipt.title')} />
        <View style={styles.empty}>
          <Receipt size={tokens.space[8]} color={theme.meta} />
          <Text variant="title">{t('receipt.none')}</Text>
          <Text variant="body" style={[styles.center, { color: theme.muted }]}>
            {t('receipt.noneBody')}
          </Text>
          <Button label={t('pay.backToOrder')} tone="ghost" onPress={back} />
        </View>
      </SafeScreen>
    );
  }

  const money = receiptFigures(o, p);
  const currency = p.currency;
  const when = new Date(p.paidAt ?? p.createdAt).toLocaleString(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: venue.data?.hours.timezone,
  });
  const method = t(
    PAY_METHODS.find((m) => m.id === (p.method === 'card' ? 'card' : p.provider))?.label ??
      'pay.card',
  );
  const card = [payStyles.card, { backgroundColor: theme.surface }];
  const where = [
    t('receipt.order', { number: o.number }),
    o.tableCode ? t('home.table', { code: o.tableCode }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeScreen>
      <PageHeader title={t('receipt.title')} subtitle={venue.data?.name} />
      <ScrollView contentContainerStyle={styles.page}>
        {p.testMode ? (
          <View style={[styles.test, { backgroundColor: theme.warningTint }]}>
            <Text variant="body-strong">{t('receipt.test')}</Text>
          </View>
        ) : null}

        <View style={card}>
          <Text variant="title">{venue.data?.name}</Text>
          <Text variant="caption" style={{ color: theme.muted }}>
            {where}
          </Text>
          <Text variant="caption" style={{ color: theme.muted }}>
            {when}
          </Text>
        </View>

        <View style={card}>
          {o.lines.map((line) => (
            <Row
              key={line.id}
              label={`${line.quantity} × ${line.name}`}
              amount={line.totalPesewas}
              currency={currency}
            />
          ))}
          <View style={[payStyles.total, { borderColor: theme.line }]} />
          <Row label={t('receipt.subtotal')} amount={money.subtotal} currency={currency} muted />
          {money.taxes.map((tax) => (
            <Row
              key={tax.code}
              label={tax.label}
              amount={tax.amountPesewas}
              currency={currency}
              muted
            />
          ))}
          <Row label={t('pay.tableTotal')} amount={money.tableTotal} currency={currency} strong />
        </View>

        <View style={card}>
          <Row label={t('pay.yourShare')} amount={money.share} currency={currency} muted />
          <Row label={t('pay.tipLine')} amount={money.tip} currency={currency} muted />
          {money.fee > 0 ? (
            <Row label={t('pay.feeLine')} amount={money.fee} currency={currency} muted />
          ) : null}
          <Row label={t('receipt.paid')} amount={money.paid} currency={currency} strong />
          <Text variant="caption" style={{ color: theme.muted }}>
            {t('receipt.paidWith', { method })}
          </Text>
          <Text variant="caption" selectable style={{ color: theme.meta }}>
            {t('receipt.reference', { reference: p.reference })}
          </Text>
        </View>

        {money.stillToPay > 0 ? (
          <Row
            label={t('receipt.stillToPay')}
            amount={money.stillToPay}
            currency={currency}
            muted
          />
        ) : null}
        <Button label={t('pay.backToOrder')} tone="ghost" onPress={back} />
      </ScrollView>
    </SafeScreen>
  );
}

function Row({
  label,
  amount,
  currency,
  muted,
  strong,
}: {
  label: string;
  amount: number;
  currency: string;
  muted?: boolean;
  strong?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={payStyles.line}>
      <Text
        variant={strong ? 'body-strong' : 'body'}
        style={[payStyles.flex, muted && { color: theme.muted }]}
      >
        {label}
      </Text>
      <PriceText amount={amount} currency={currency} size={strong ? 'title' : 'body'} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: tokens.grid.mobile.margin,
    gap: tokens.space[4],
    paddingBottom: tokens.space[16],
  },
  test: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[6],
    paddingTop: tokens.space[16],
  },
  center: { textAlign: 'center' },
});
