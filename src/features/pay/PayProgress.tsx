import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Check, Clock, Smartphone, X, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { PayUiState } from './paymentMachine';
import { clock } from './paymentWatch';

export type Charge = {
  amountPesewas: number;
  currency: string;
  /** "MoMo" or "Card" */
  method: string;
  /** "024 123 4567", for a MoMo charge sent straight to a phone. */
  phone?: string;
  /** Paid on Paystack's page, so "time ran out" means the guest cancelled or left it. */
  card: boolean;
  testMode: boolean;
  /** Paystack's own words for the prompt, when it sent some. */
  displayText?: string;
  /** "Mama's Kitchen · Order #24", over the badge. */
  heading: string;
};

/**
 * What the guest sees once a payment has started, as the design canvas draws it (Clarke,
 * 2026-11-23): a small venue and order line, a round badge with soft rings, a bold headline,
 * then details and buttons. Only a server "succeeded" ever shows as paid (paymentMachine).
 */
export function PayProgress({
  state,
  left,
  total,
  charge,
  onRetry,
  onDone,
  onReceipt,
}: {
  state: PayUiState;
  left: number;
  total: number;
  charge: Charge;
  onRetry: () => void;
  onDone: () => void;
  onReceipt: (reference: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const amount = formatMoney(pesewas(charge.amountPesewas), charge.currency);
  const again = (
    <>
      <Button label={t('pay.tryAgain')} onPress={onRetry} />
      <Button label={t('pay.backToOrder')} tone="ghost" onPress={onDone} />
    </>
  );

  switch (state.kind) {
    case 'awaiting_approval':
      return (
        <Stage
          heading={charge.heading}
          icon={Smartphone}
          tone="ink"
          title={t('pay.approveTitle')}
          body={charge.displayText ?? t('pay.waiting')}
          details={<ChargeCard charge={charge} amount={amount} />}
        >
          <View style={styles.timer} accessible accessibilityLiveRegion="polite">
            <Text variant="display-m" style={styles.num}>
              {clock(left)}
            </Text>
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('pay.left')}
            </Text>
            <View style={[styles.track, { backgroundColor: theme.line }]}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: theme.fill,
                    width: `${total > 0 ? Math.min(100, (left / total) * 100) : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        </Stage>
      );
    case 'opening_checkout':
    case 'checking':
      return (
        <Stage
          heading={charge.heading}
          tone="ink"
          title={t(state.kind === 'checking' ? 'pay.checking' : 'pay.openingCard')}
          details={<ChargeCard charge={charge} amount={amount} />}
        >
          <ActivityIndicator color={theme.ink} />
        </Stage>
      );
    case 'paid':
      return (
        <Stage
          heading={charge.heading}
          icon={Check}
          tone="success"
          title={t('pay.orderPaid')}
          body={t('pay.paidBody', { amount })}
          details={
            <View style={[styles.card, { backgroundColor: theme.wash }]}>
              <Row label={t('pay.paidWith')} value={charge.method} />
              <Row label={t('pay.reference')} value={state.reference} />
            </View>
          }
        >
          <Button label={t('pay.done')} onPress={onDone} />
          <Button
            label={t('pay.getReceipt')}
            tone="ghost"
            onPress={() => onReceipt(state.reference)}
          />
        </Stage>
      );
    case 'failed':
      return (
        <Stage
          heading={charge.heading}
          icon={X}
          tone="error"
          title={t('pay.failedTitle')}
          // Some reasons already say nothing was taken; don't say it twice.
          body={
            state.message.includes(t('pay.nothingTaken'))
              ? state.message
              : t('pay.failedBody', { reason: state.message })
          }
          details={<ChargeCard charge={charge} amount={amount} />}
        >
          {again}
        </Stage>
      );
    case 'timed_out':
      return (
        <Stage
          heading={charge.heading}
          icon={charge.card ? X : Clock}
          tone={charge.card ? 'error' : 'ink'}
          title={t(charge.card ? 'pay.cardCancelledTitle' : 'pay.timedOutTitle')}
          body={t(charge.card ? 'pay.cardCancelledBody' : 'pay.timedOutBody')}
          details={<ChargeCard charge={charge} amount={amount} />}
        >
          {again}
        </Stage>
      );
    default:
      return null;
  }
}

/** One step: the venue and order, a ringed badge, a headline and a line, details, then buttons. */
function Stage({
  heading,
  icon: Icon,
  tone,
  title,
  body,
  details,
  children,
}: {
  heading: string;
  icon?: LucideIcon;
  tone: 'ink' | 'success' | 'error';
  title: string;
  body?: string;
  details?: ReactNode;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const solid = { ink: theme.fill, success: theme.success, error: theme.error }[tone];
  const wash = { ink: theme.tint, success: theme.successTint, error: theme.errorTint }[tone];
  return (
    <View style={styles.stage}>
      <Text variant="caption" style={[styles.center, styles.strong, { color: theme.muted }]}>
        {heading}
      </Text>
      {Icon ? (
        <View style={styles.rings} accessibilityElementsHidden importantForAccessibility="no">
          <View style={[styles.ring, styles.outer, { backgroundColor: wash }]} />
          <View style={[styles.ring, styles.inner, { backgroundColor: wash }]} />
          <View style={[styles.badge, { backgroundColor: solid }]}>
            <Icon size={40} color={theme.white} strokeWidth={2.6} />
          </View>
        </View>
      ) : null}
      <View style={styles.words}>
        <Text variant="display-m" accessibilityRole="header" style={styles.center}>
          {title}
        </Text>
        {body ? (
          <Text variant="body" style={[styles.center, { color: theme.muted }]}>
            {body}
          </Text>
        ) : null}
      </View>
      {details}
      <View style={styles.buttons}>{children}</View>
    </View>
  );
}

function ChargeCard({ charge, amount }: { charge: Charge; amount: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.card, styles.charge, { backgroundColor: theme.wash }]}>
      <View style={styles.flex}>
        <Text variant="body-strong" numberOfLines={1}>
          {charge.method}
        </Text>
        {charge.phone ? (
          <Text variant="caption" style={{ color: theme.muted }}>
            {charge.phone}
          </Text>
        ) : charge.testMode ? (
          <Text variant="caption" style={{ color: theme.meta }}>
            {t('pay.test')}
          </Text>
        ) : null}
      </View>
      <Text variant="title" style={styles.num}>
        {amount}
      </Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text variant="body" style={[styles.flex, { color: theme.muted }]}>
        {label}
      </Text>
      <Text variant="body-strong" numberOfLines={1} style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const RINGS = 176;
const BADGE = 88;

const styles = StyleSheet.create({
  stage: { gap: tokens.space[5], paddingTop: tokens.space[6] },
  center: { textAlign: 'center' },
  strong: { fontWeight: '600' },
  rings: {
    width: RINGS,
    height: RINGS,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { position: 'absolute', borderRadius: RINGS / 2 },
  outer: { width: RINGS, height: RINGS, opacity: 0.5 },
  inner: { width: RINGS - 44, height: RINGS - 44 },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(17, 17, 17, 0.15)',
  },
  words: { gap: tokens.space[2] },
  card: { padding: tokens.space[4], borderRadius: tokens.radius.lg, gap: tokens.space[2] },
  charge: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  value: { maxWidth: '60%', textAlign: 'right' },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
  buttons: { gap: tokens.space[2] },
  timer: { alignItems: 'center', gap: tokens.space[2] },
  track: {
    alignSelf: 'stretch',
    height: tokens.space[1],
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
    marginTop: tokens.space[2],
  },
  bar: { height: '100%', borderRadius: tokens.radius.full },
});
