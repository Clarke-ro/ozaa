import { useEffect, useReducer, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, CircleCheck, Minus, Plus, Receipt, Smartphone } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Redirect } from 'expo-router';
import { api } from '@/lib/api';
import { env } from '@/lib/env';
import { asGhanaPhone, countryForVenue, parsePhone } from '@/lib/phone';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { canPayOnline } from '@/lib/payments';
import { useVenue } from '@/features/venue';
import { pesewas } from '@/lib/brand';
import { useGuestSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { PriceText } from '@/ui/PriceText';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { FilterChips } from '@/ui/FilterChips';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { payInitial, payTransition } from './paymentMachine';
import { PayMethods, type PayMethod } from './PayMethods';
import { quoteBill } from './quoteBill';
import { guestKeys } from '@/lib/queryKeys';

const TIPS = [0, 5, 10, 15] as const;

export function PayScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
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
  const [mode, setMode] = useState<'whole' | 'equal' | 'items'>('whole');
  const [parts, setParts] = useState(2);
  // No tip and an empty number to start: the guest chooses, nothing is decided for them.
  const [tip, setTip] = useState<(typeof TIPS)[number]>(0);
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<PayMethod>('mtn');
  const [mine, setMine] = useState<string[]>([]);
  const [payState, send] = useReducer(payTransition, payInitial);
  const [reference, setReference] = useState<string | null>(null);

  const payment = useQuery({
    queryKey: guestKeys.payment(reference),
    queryFn: () => api.getPayment(reference ?? ''),
    enabled:
      Boolean(reference) && (payState.kind === 'awaiting_approval' || payState.kind === 'checking'),
    refetchInterval: payState.kind === 'awaiting_approval' ? 3000 : false,
  });

  useEffect(() => {
    if (!payment.data) return;
    if (payment.data.status === 'succeeded') {
      send({ type: 'server_succeeded', reference: payment.data.reference });
      void client.invalidateQueries({ queryKey: guestKeys.loyaltyAll() });
    }
    if (payment.data.status === 'failed')
      send({ type: 'server_failed', message: payment.data.failureReason ?? t('pay.failed') });
    if (payment.data.status === 'abandoned') send({ type: 'verify_still_open' });
  }, [client, payment.data, t]);

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

  // The same rules the server uses (quoteBill): paid lines are skipped, an equal split gives
  // leftover pesewas to earlier payers, and My items needs at least one dish picked.
  const preview = (() => {
    try {
      return quoteBill(
        order.data.lines.map((l) => ({
          id: l.id,
          totalPesewas: pesewas(l.totalPesewas),
          paid: l.paid,
        })),
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
  const due = preview?.totalPesewas ?? 0;
  const card = [styles.card, { backgroundColor: theme.surface }];

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
    setReference(started.reference);
    if (started.status === 'pay_offline') {
      send({
        type: 'momo_started',
        reference: started.reference,
        approveBy: Date.parse(started.approveBy ?? ''),
      });
    } else if (started.authorizationUrl) {
      send({ type: 'card_started', reference: started.reference, url: started.authorizationUrl });
    }
  };

  return (
    <SafeScreen>
      <PageHeader
        title={t('pay.title')}
        subtitle={t('home.table', { code: order.data.tableCode ?? '' })}
      />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {payState.kind === 'paid' ? (
          <View style={[card, styles.state]}>
            <CircleCheck size={32} color={theme.success} />
            <Text variant="display-m">{t('pay.paid')}</Text>
          </View>
        ) : null}
        {payState.kind === 'awaiting_approval' || payState.kind === 'checking' ? (
          <View style={[card, styles.state]}>
            <Smartphone size={32} color={theme.ink} />
            <Text variant="title" style={styles.center}>
              {payState.kind === 'checking' ? t('pay.checking') : t('pay.waiting')}
            </Text>
          </View>
        ) : null}
        {payState.kind === 'choosing' || payState.kind === 'failed' ? (
          <>
            {payState.kind === 'failed' ? (
              <Text variant="body" style={{ color: theme.error }}>
                {t('pay.failed')}
              </Text>
            ) : null}

            <View style={card}>
              {order.data.lines.map((line) => {
                const picked = mine.includes(line.id);
                const pickable = mode === 'items' && !line.paid;
                return (
                  <Pressable
                    key={line.id}
                    disabled={!pickable}
                    accessibilityRole={pickable ? 'checkbox' : undefined}
                    accessibilityState={pickable ? { checked: picked } : undefined}
                    onPress={() =>
                      setMine((cur) =>
                        picked ? cur.filter((id) => id !== line.id) : [...cur, line.id],
                      )
                    }
                    style={styles.line}
                  >
                    {mode === 'items' ? (
                      <View
                        style={[
                          styles.box,
                          {
                            borderColor: picked ? theme.ink : theme.line,
                            backgroundColor: picked ? theme.ink : theme.surface,
                          },
                        ]}
                      >
                        {picked ? <Check size={14} color={theme.white} strokeWidth={3} /> : null}
                      </View>
                    ) : null}
                    <Text variant="body" style={[styles.flex, line.paid && { color: theme.meta }]}>
                      {line.quantity} × {line.name}
                    </Text>
                    {line.paid ? (
                      <Text variant="caption" style={{ color: theme.success }}>
                        {t('pay.linePaid')}
                      </Text>
                    ) : (
                      <PriceText amount={line.totalPesewas} currency={currency} />
                    )}
                  </Pressable>
                );
              })}
              <View style={[styles.line, styles.total, { borderColor: theme.line }]}>
                <Text variant="body-strong" style={styles.flex}>
                  {t('pay.tableTotal')}
                </Text>
                <PriceText amount={order.data.totalPesewas} currency={currency} size="title" />
              </View>
            </View>

            <View style={styles.block}>
              <Text variant="title">{t('pay.how')}</Text>
              <FilterChips<'whole' | 'equal' | 'items'>
                label={t('pay.how')}
                value={mode}
                onChange={setMode}
                items={(['whole', 'equal', 'items'] as const).map((id) => ({
                  id,
                  label: t(`pay.${id}`),
                }))}
              />
              {mode === 'equal' ? (
                <View style={[card, styles.people]}>
                  <Text variant="body-strong" style={styles.flex}>
                    {t('pay.people')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('pay.fewer')}
                    onPress={() => setParts((v) => Math.max(MIN_PARTS, v - 1))}
                    style={[styles.step, { backgroundColor: theme.wash }]}
                  >
                    <Minus size={18} color={theme.text} />
                  </Pressable>
                  <Text variant="title" style={styles.num}>
                    {parts}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('pay.more')}
                    onPress={() => setParts((v) => Math.min(MAX_PARTS, v + 1))}
                    style={[styles.step, { backgroundColor: theme.wash }]}
                  >
                    <Plus size={18} color={theme.text} />
                  </Pressable>
                </View>
              ) : null}
              {mode === 'items' ? (
                <Text variant="caption" style={{ color: theme.muted }}>
                  {t('pay.pickItems')}
                </Text>
              ) : null}
            </View>

            <View style={styles.block}>
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

            <View style={styles.block}>
              <Text variant="title">{t('pay.with')}</Text>
              <PayMethods
                value={method}
                onChange={setMethod}
                phone={phone}
                onPhone={setPhone}
                // Demo builds only: the mock accepts any valid number and charges nothing.
                hint={env.EXPO_PUBLIC_API_MODE === 'mock' ? t('pay.testNumber') : undefined}
              />
            </View>

            <View style={card}>
              <SumRow
                label={t('pay.yourShare')}
                amount={preview?.sharePesewas ?? 0}
                currency={currency}
              />
              <SumRow
                label={t('pay.tipLine')}
                amount={preview?.tipPesewas ?? 0}
                currency={currency}
              />
              <View style={[styles.line, styles.total, { borderColor: theme.line }]}>
                <Text variant="body-strong" style={styles.flex}>
                  {t('pay.due')}
                </Text>
                <PriceText amount={due} currency={currency} size="title" />
              </View>
            </View>
            <Button
              label={t('pay.payNow', { amount: formatMoney(pesewas(due), currency) })}
              disabled={!preview || due <= 0}
              onPress={() => {
                if (payState.kind === 'failed') send({ type: 'reset' });
                void start().catch(() =>
                  send({ type: 'start_rejected', message: t('pay.failed') }),
                );
              }}
            />
            {venue.data?.payMethods?.testMode ? (
              <Text variant="caption" style={[styles.center, { color: theme.meta }]}>
                {t('pay.test')}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

// The contract allows splitting between 2 and 20 people.
const MIN_PARTS = 2;
const MAX_PARTS = 20;

function SumRow({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  const theme = useTheme();
  return (
    <View style={styles.line}>
      <Text variant="body" style={[styles.flex, { color: theme.muted }]}>
        {label}
      </Text>
      <PriceText amount={amount} currency={currency} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: tokens.grid.mobile.margin,
    gap: tokens.space[5],
    paddingBottom: tokens.space[16],
  },
  card: {
    gap: tokens.space[2],
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  block: { gap: tokens.space[3] },
  line: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], minHeight: 28 },
  total: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space[2],
    marginTop: tokens.space[1],
  },
  flex: { flex: 1 },
  box: {
    width: 20,
    height: 20,
    borderRadius: tokens.radius.sm - 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  people: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  step: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] },
  state: { alignItems: 'center', gap: tokens.space[3], paddingVertical: tokens.space[8] },
  empty: {
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[6],
    paddingTop: tokens.space[16],
  },
  center: { textAlign: 'center' },
});
