import { useEffect, useReducer, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { env } from '@/lib/env';
import { asGhanaPhone, countryForVenue, parsePhone } from '@/lib/phone';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { useVenue } from '@/features/venue';
import { pesewas } from '@/lib/brand';
import { useGuestSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { PriceText } from '@/ui/PriceText';
import { Text } from '@/ui/Text';
import { EmptyState, ErrorState, LoadingState } from '@/ui/states';
import { useTheme } from '@/ui/theme';
import { payInitial, payTransition } from './paymentMachine';

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
  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
  });
  const [mode, setMode] = useState<'whole' | 'equal' | 'items'>('whole');
  const [parts, setParts] = useState(2);
  // No tip and an empty number to start: the guest chooses, nothing is decided for them.
  const [tip, setTip] = useState<(typeof TIPS)[number]>(0);
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<'mtn' | 'vod' | 'atl' | 'card'>('mtn');
  const [payState, send] = useReducer(payTransition, payInitial);
  const [reference, setReference] = useState<string | null>(null);

  const payment = useQuery({
    queryKey: ['payment', reference],
    queryFn: () => api.getPayment(reference ?? ''),
    enabled:
      Boolean(reference) && (payState.kind === 'awaiting_approval' || payState.kind === 'checking'),
    refetchInterval: payState.kind === 'awaiting_approval' ? 3000 : false,
  });

  useEffect(() => {
    if (!payment.data) return;
    if (payment.data.status === 'succeeded') {
      send({ type: 'server_succeeded', reference: payment.data.reference });
      void client.invalidateQueries({ queryKey: ['loyalty'] });
    }
    if (payment.data.status === 'failed')
      send({ type: 'server_failed', message: payment.data.failureReason ?? t('pay.failed') });
    if (payment.data.status === 'abandoned') send({ type: 'verify_still_open' });
  }, [client, payment.data, t]);

  if (!orderId) return <EmptyState message={t('menu.empty')} />;
  if (order.isLoading) return <LoadingState />;
  if (order.isError || !order.data) return <ErrorState onRetry={() => void order.refetch()} />;

  const share =
    mode === 'equal' ? Math.ceil(order.data.totalPesewas / parts) : order.data.totalPesewas;
  const tipAmount = Math.round((share * tip) / 100);
  const due = share + tipAmount;

  const start = async () => {
    send({ type: 'request_quote' });
    const parsed = asGhanaPhone(parsePhone(phone, country));
    const quote = await api.quoteBill(order.data.id, {
      mode,
      parts: mode === 'equal' ? parts : undefined,
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
      <View style={{ padding: 20, gap: 14 }}>
        {payState.kind === 'paid' ? <Text variant="display-m">{t('pay.paid')}</Text> : null}
        {payState.kind === 'failed' ? <Text variant="body">{t('pay.failed')}</Text> : null}
        {payState.kind === 'awaiting_approval' || payState.kind === 'checking' ? (
          <Text variant="display-m">
            {payState.kind === 'checking' ? t('pay.checking') : t('pay.waiting')}
          </Text>
        ) : null}
        {payState.kind === 'choosing' || payState.kind === 'failed' ? (
          <>
            <View style={[styles.box, { borderColor: theme.line }]}>
              {order.data.lines.map((line) => (
                <View key={line.id} style={styles.row}>
                  <Text>
                    {line.quantity} × {line.name}
                  </Text>
                  <PriceText amount={line.totalPesewas} currency={currency} />
                </View>
              ))}
              <View style={styles.row}>
                <Text variant="body-strong">{t('pay.tableTotal')}</Text>
                <PriceText amount={order.data.totalPesewas} currency={currency} />
              </View>
            </View>
            <Text variant="body-strong">{t('pay.how')}</Text>
            <View style={styles.row}>
              {(['whole', 'equal', 'items'] as const).map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  onPress={() => setMode(item)}
                  style={[
                    styles.seg,
                    {
                      backgroundColor: mode === item ? theme.white : theme.wash,
                      borderColor: mode === item ? theme.line : 'transparent',
                    },
                  ]}
                >
                  <Text variant="caption">{t(`pay.${item}`)}</Text>
                </Pressable>
              ))}
            </View>
            {mode === 'equal' ? (
              <View style={styles.row}>
                <Text>{t('pay.people')}</Text>
                <View style={styles.row}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fewer people"
                    onPress={() => setParts((value) => Math.max(2, value - 1))}
                  >
                    <Text variant="title"> − </Text>
                  </Pressable>
                  <Text variant="title">{parts}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="More people"
                    onPress={() => setParts((value) => Math.min(20, value + 1))}
                  >
                    <Text variant="title"> + </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            <Text variant="body-strong">{t('pay.tip')}</Text>
            <View style={styles.row}>
              {TIPS.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => setTip(value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: tip === value ? theme.fill : theme.white,
                      borderColor: theme.line,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: tip === value ? theme.onFill : theme.text }}
                  >
                    {value === 0 ? t('pay.noTip') : `${value}%`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text variant="body-strong">{t('pay.with')}</Text>
            <View style={styles.wrapRow}>
              {(['mtn', 'vod', 'atl', 'card'] as const).map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: method === item }}
                  onPress={() => setMethod(item)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: method === item ? theme.fill : theme.white,
                      borderColor: theme.line,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: method === item ? theme.onFill : theme.text }}
                  >
                    {t(
                      item === 'mtn'
                        ? 'pay.mtn'
                        : item === 'vod'
                          ? 'pay.telecel'
                          : item === 'atl'
                            ? 'pay.at'
                            : 'pay.card',
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>
            {method !== 'card' ? (
              <>
                <TextInput
                  accessibilityLabel={t('pay.phone')}
                  placeholder={t('pay.phone')}
                  placeholderTextColor={theme.meta}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                />
                {/* Demo builds only: the mock accepts any valid number and charges nothing. */}
                {env.EXPO_PUBLIC_API_MODE === 'mock' ? (
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {t('pay.testNumber')}
                  </Text>
                ) : null}
              </>
            ) : null}
            <Button
              label={`${t('pay.share')}  ${formatMoney(pesewas(due), currency)}`}
              onPress={() => {
                if (payState.kind === 'failed') send({ type: 'reset' });
                void start().catch(() =>
                  send({ type: 'start_rejected', message: t('pay.failed') }),
                );
              }}
            />
            <Text variant="caption" style={{ color: theme.meta }}>
              {t('pay.test')}
            </Text>
          </>
        ) : null}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seg: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { borderWidth: 1, borderRadius: 12, height: 48, paddingHorizontal: 12 },
});
