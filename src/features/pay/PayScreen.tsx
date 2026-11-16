import { useEffect, useReducer, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Receipt } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { previewFee } from '@/lib/paystackFee';
import { Redirect, useRouter, type Href } from 'expo-router';
import { api } from '@/lib/api';
import type { Payment } from '@/lib/api/types';
import { DEMO } from '@/lib/demo';
import { asGhanaPhone, countryForVenue, formatPhone, parsePhone } from '@/lib/phone';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { canPayOnline } from '@/lib/payments';
import { useVenue } from '@/features/venue';
import { pesewas } from '@/lib/brand';
import { useGuestSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { FilterChips } from '@/ui/FilterChips';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { payInitial, payTransition } from './paymentMachine';
import { secondsLeft } from './paymentWatch';
import { BillLines } from './BillLines';
import { openCheckout } from './openCheckout';
import { useCardReturn } from './useCardReturn';
import { PAY_METHODS, PayMethods, type PayMethod } from './PayMethods';
import { PayProgress } from './PayProgress';
import { PaySummary } from './PaySummary';
import { payStyles } from './payStyles';
import { quoteBill } from './quoteBill';
import { SplitChoice, type SplitMode } from './SplitChoice';
import { usePaymentWatch } from './usePaymentWatch';
import { guestKeys } from '@/lib/queryKeys';

const TIPS = [0, 5, 10, 15] as const;
// Screens shown in place of the form once a payment has started (PayProgress).
const IN_PROGRESS = [
  'awaiting_approval',
  'opening_checkout',
  'checking',
  'paid',
  'failed',
  'timed_out',
];

export function PayScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const venue = useVenue(slug);
  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const country = countryForVenue({
    timezone: venue.data?.hours.timezone,
    currency: venue.data?.currency,
  });
  const orderId = useGuestSession((state) => (state.slug === slug ? state.orderId : null));
  const hydrated = useGuestSession((state) => state.hydrated);
  const order = useQuery({
    queryKey: guestKeys.order(orderId),
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
  });
  const [mode, setMode] = useState<SplitMode>('whole');
  const [parts, setParts] = useState(2);
  // No tip and an empty number to start: the guest chooses, nothing is decided for them.
  const [tip, setTip] = useState<(typeof TIPS)[number]>(0);
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<PayMethod>('mtn');
  const [mine, setMine] = useState<string[]>([]);
  const [payState, send] = useReducer(payTransition, payInitial);
  const [started, setStarted] = useState<Payment | null>(null);
  const left = usePaymentWatch(payState, send, t('pay.nothingTaken'));
  // The payment on screen: the one just started here, or the one a card page sent us back with.
  const returned = useCardReturn(send);
  const shown = started ?? returned;

  // Paid: the order now shows paid and a loyalty stamp may have landed.
  useEffect(() => {
    if (payState.kind !== 'paid') return;
    void client.invalidateQueries({ queryKey: guestKeys.order(orderId) });
    void client.invalidateQueries({ queryKey: guestKeys.loyaltyAll() });
  }, [client, orderId, payState.kind]);

  // On phones the saved visit takes a moment to load; don't flash "nothing to pay" meanwhile.
  if (!hydrated || venue.isLoading) return <LoadingState />;
  // No Paystack connected: this venue takes payment in person, so an old Pay link lands on the order.
  if (venue.data && !canPayOnline(venue.data)) return <Redirect href={`/${slug}/status`} />;
  if (!orderId) {
    return (
      <SafeScreen>
        <PageHeader title={t('pay.title')} />
        <View style={styles.empty}>
          <Receipt size={32} color={theme.meta} />
          <Text variant="title">{t('pay.noOrder')}</Text>
          <Text variant="body" style={[styles.center, { color: theme.muted }]}>
            {t('pay.noOrderBody')}
          </Text>
        </View>
      </SafeScreen>
    );
  }
  if (order.isLoading) return <LoadingState />;
  if (order.isError || !order.data) return <ErrorState onRetry={() => void order.refetch()} />;

  // The same rules the server uses (quoteBill): what is left is the order total minus what is
  // paid, an equal split gives leftover pesewas to earlier payers, and My items needs a dish.
  const preview = (() => {
    try {
      return quoteBill(
        {
          lines: order.data.lines.map((l) => ({
            id: l.id,
            totalPesewas: pesewas(l.totalPesewas),
            paid: l.paid,
          })),
          totalPesewas: pesewas(order.data.totalPesewas),
          paidPesewas: pesewas(order.data.paidPesewas),
        },
        {
          mode,
          parts: mode === 'equal' ? parts : undefined,
          lineIds: mode === 'items' ? mine : undefined,
          tip: { percent: tip },
        },
      );
    } catch {
      return null;
    }
  })();
  // The fee the venue passes on, worked out the server's way so the guest sees it before paying.
  // The quote then charges the server's own figure.
  const fee = preview
    ? previewFee(preview.sharePesewas + preview.tipPesewas, venue.data?.payMethods)
    : 0;
  const due = (preview?.totalPesewas ?? 0) + fee;

  const start = async () => {
    send({ type: 'request_quote' });
    const parsed = asGhanaPhone(parsePhone(phone, country));
    const quote = await api.quoteBill(order.data.id, {
      mode,
      parts: mode === 'equal' ? parts : undefined,
      lineIds: mode === 'items' ? mine : undefined,
      tip: { percent: tip },
    });
    send({ type: 'quote_ready' });
    send({ type: 'confirm' });
    const idempotencyKey = Crypto.randomUUID();
    const started = await api.initializePayment(
      {
        quoteId: quote.quoteId,
        method: method === 'card' ? 'card' : 'momo',
        momo: method === 'card' || !parsed ? undefined : { phone: parsed, provider: method },
      },
      { idempotencyKey },
    );
    setStarted(started);
    if (started.status === 'pay_offline') {
      send({
        type: 'momo_started',
        reference: started.reference,
        approveBy: Date.parse(started.approveBy ?? ''),
      });
    } else if (started.authorizationUrl) {
      send({ type: 'card_started', reference: started.reference, url: started.authorizationUrl });
      const where = await openCheckout(started.authorizationUrl, (path) =>
        router.push(path as Href),
      );
      if (where === 'back') send({ type: 'returned_from_checkout' });
    }
  };

  // What is being paid, for the steps after Pay: the server's amount once it has one.
  const typed = asGhanaPhone(parsePhone(phone, country));
  const paidWith: PayMethod = shown
    ? shown.method === 'card'
      ? 'card'
      : (shown.provider ?? method)
    : method;
  const card = paidWith === 'card';
  const charge = {
    amountPesewas: shown?.amountPesewas ?? due,
    currency,
    method: t(PAY_METHODS.find((m) => m.id === paidWith)?.label ?? 'pay.card'),
    phone: typed && !card ? formatPhone(typed) : undefined,
    card,
    testMode: shown?.testMode ?? venue.data?.payMethods?.testMode ?? false,
    displayText: shown?.displayText,
  };
  const total = shown
    ? secondsLeft(Date.parse(shown.approveBy ?? ''), Date.parse(shown.createdAt))
    : 0;

  return (
    <SafeScreen>
      <PageHeader
        title={t('pay.title')}
        subtitle={
          order.data.tableCode
            ? t('home.table', { code: order.data.tableCode })
            : (venue.data?.name ?? '')
        }
      />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {IN_PROGRESS.includes(payState.kind) ? (
          <PayProgress
            state={payState}
            left={left}
            total={total}
            charge={charge}
            onRetry={() => send({ type: 'reset' })}
            onDone={() => router.push(`/${slug}/status`)}
            onReceipt={(reference) => router.push(`/${slug}/receipt?reference=${reference}`)}
          />
        ) : (
          <>
            <BillLines
              order={order.data}
              picking={mode === 'items'}
              mine={mine}
              onToggle={(id) =>
                setMine((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
              }
              currency={currency}
            />
            {/* Splitting is for a table sharing a bill; a pickup or delivery order is paid whole. */}
            {order.data.tableCode ? (
              <SplitChoice mode={mode} onMode={setMode} parts={parts} onParts={setParts} />
            ) : null}

            <View style={payStyles.block}>
              <Text variant="title">{t('pay.tip')}</Text>
              <FilterChips
                label={t('pay.tip')}
                value={String(tip)}
                onChange={(id) => setTip(Number(id) as (typeof TIPS)[number])}
                items={TIPS.map((v) => ({
                  id: String(v),
                  label: v === 0 ? t('pay.noTip') : `${v}%`,
                }))}
              />
            </View>

            <View style={payStyles.block}>
              <Text variant="title">{t('pay.with')}</Text>
              <PayMethods
                value={method}
                onChange={setMethod}
                phone={phone}
                onPhone={setPhone}
                // Demo builds only: the mock accepts any valid number and charges nothing.
                hint={DEMO ? t('pay.testNumber') : undefined}
              />
            </View>

            <PaySummary
              share={preview?.sharePesewas ?? 0}
              tip={preview?.tipPesewas ?? 0}
              fee={fee}
              due={due}
              currency={currency}
            />
            <Button
              label={t('pay.payNow', { amount: formatMoney(pesewas(due), currency) })}
              disabled={!preview || due <= 0}
              loading={payState.kind !== 'choosing'}
              onPress={() =>
                void start().catch(() =>
                  send({ type: 'start_rejected', message: t('pay.nothingTaken') }),
                )
              }
            />
            {venue.data?.payMethods?.testMode ? (
              <Text variant="caption" style={[styles.center, { color: theme.meta }]}>
                {t('pay.test')}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: tokens.grid.mobile.margin,
    gap: tokens.space[5],
    paddingBottom: tokens.space[16],
  },
  empty: {
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[6],
    paddingTop: tokens.space[16],
  },
  center: { textAlign: 'center' },
});
