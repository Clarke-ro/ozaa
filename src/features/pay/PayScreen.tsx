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
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { canPayOnline } from '@/lib/payments';
import { useVenue } from '@/features/venue';
import { pesewas } from '@/lib/brand';
import { useGuestSession, useMyCalls } from '@/features/session';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { payInitial, payTransition } from './paymentMachine';
import { secondsLeft } from './paymentWatch';
import { BillLines } from './BillLines';
import { openCheckout } from './openCheckout';
import { useCardReturn } from './useCardReturn';
import { BillSplit } from './BillSplit';
import { MethodBoxes } from './MethodBoxes';
import { payMethodLabel } from './payLabels';
import { payMethodsFor, type PayPick, type TipPercent } from './payPick';
import { TipBoxes } from './TipBoxes';
import { laterOption } from './laterOption';
import { PayProgress } from './PayProgress';
import { PaySummary } from './PaySummary';
import { payStyles } from './payStyles';
import { quoteBill } from './quoteBill';
import type { SplitMode } from './SplitChoice';
import { usePaymentWatch } from './usePaymentWatch';
import { guestKeys } from '@/lib/queryKeys';

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
  const orderId = useGuestSession((state) => (state.slug === slug ? state.orderId : null));
  const hydrated = useGuestSession((state) => state.hydrated);
  const order = useQuery({
    queryKey: guestKeys.order(orderId),
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
  });
  const [mode, setMode] = useState<SplitMode>('whole');
  const [parts, setParts] = useState(2);
  // Whole bill, no tip and MoMo to start (Clarke, 2026-11-23).
  const [tip, setTip] = useState<TipPercent>(0);
  const [pick, setPick] = useState<PayPick>('momo');
  const [deferring, setDeferring] = useState(false);
  const rememberCalls = useMyCalls((s) => s.add);
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
      // No phone and no network: Paystack's page asks for them (contract, 2026-11-23).
      { quoteId: quote.quoteId, method: pick === 'card' ? 'card' : 'momo' },
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

  // Cash means paying in person later: the bill after the meal, or to the rider on delivery.
  const laterKey = laterOption(order.data);
  const methods = payMethodsFor({
    table: Boolean(order.data.tableCode),
    delivery: order.data.source === 'delivery',
    cash: laterKey !== null && (venue.data?.payMethods?.cash ?? false),
  });
  const chosen = methods.includes(pick) ? pick : 'momo';
  const later = chosen === 'cash';
  const defer = async () => {
    setDeferring(true);
    try {
      if (order.data.tableCode) {
        // Asking for the bill is a waiter call, so staff see it with the table's other calls.
        const body = { reason: 'bill' as const };
        const call = await api.callWaiter(body, { idempotencyKey: Crypto.randomUUID() });
        rememberCalls([call.id]);
      }
      router.replace(`/${slug}/status`);
    } finally {
      setDeferring(false);
    }
  };
  // What is being paid, for the steps after Pay: the server's payment once there is one.
  const charge = {
    amountPesewas: shown?.amountPesewas ?? due,
    currency,
    method: t(payMethodLabel(shown ?? { method: chosen === 'card' ? 'card' : 'momo' })),
    // Only a MoMo charge sent straight to a phone waits on the phone; the rest is Paystack's page.
    card: shown ? shown.status !== 'pay_offline' : true,
    testMode: shown?.testMode ?? venue.data?.payMethods?.testMode ?? false,
    displayText: shown?.displayText,
    heading: [venue.data?.name, t('status.title', { number: order.data.number })]
      .filter(Boolean)
      .join(' · '),
  };
  const total = shown
    ? secondsLeft(Date.parse(shown.approveBy ?? ''), Date.parse(shown.createdAt))
    : 0;

  return (
    <SafeScreen background={theme.white}>
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
            {order.data.tableCode && !later ? (
              <BillSplit
                mode={mode}
                onMode={setMode}
                parts={parts}
                onParts={setParts}
                // My items ticks the dishes in the bill above.
                dishes={[]}
                mine={mine}
                onMine={setMine}
                currency={currency}
              />
            ) : null}

            {later ? null : <TipBoxes value={tip} onChange={setTip} />}

            <View style={payStyles.block}>
              <Text variant="title" accessibilityRole="header">
                {t('pay.with')}
              </Text>
              <MethodBoxes
                methods={methods}
                value={chosen}
                onChange={setPick}
                delivery={order.data.source === 'delivery'}
              />
            </View>

            {later ? (
              <Button
                label={t(order.data.tableCode ? 'payment.requestBill' : 'payment.confirmDelivery')}
                loading={deferring}
                onPress={() => void defer()}
              />
            ) : (
              <>
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
              </>
            )}
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
