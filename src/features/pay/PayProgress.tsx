import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  CircleCheck,
  CircleX,
  Clock,
  CreditCard,
  Smartphone,
  type LucideIcon,
} from 'lucide-react-native';
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
  /** "MTN Mobile Money" */
  method: string;
  /** "024 123 4567", for MoMo. */
  phone?: string;
  /** Paid on Paystack's card page, so "time ran out" means the guest cancelled or left it. */
  card: boolean;
  testMode: boolean;
  /** Paystack's own words for the prompt, when it sent some. */
  displayText?: string;
};

/**
 * What the guest sees after tapping Pay with MoMo: approve on the phone with a countdown, then
 * paid, failed or timed out. Only a server "succeeded" ever shows as paid (paymentMachine).
 */
export function PayProgress({
  state,
  left,
  total,
  charge,
  onRetry,
  onDone,
}: {
  state: PayUiState;
  left: number;
  total: number;
  charge: Charge;
  onRetry: () => void;
  onDone: () => void;
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
          icon={Smartphone}
          tone="ink"
          title={t('pay.approveTitle')}
          body={charge.displayText ?? t('pay.waiting')}
          charge={charge}
          amount={amount}
        >
          <View style={styles.timer} accessible accessibilityLiveRegion="polite">
            <Text variant="display-m" style={styles.clock}>
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
      return (
        <Stage tone="ink" title={t('pay.openingCard')} charge={charge} amount={amount}>
          <ActivityIndicator color={theme.ink} />
        </Stage>
      );
    case 'checking':
      return (
        <Stage tone="ink" title={t('pay.checking')} charge={charge} amount={amount}>
          <ActivityIndicator color={theme.ink} />
        </Stage>
      );
    case 'paid':
      return (
        <Stage icon={CircleCheck} tone="success" title={amount} body={t('pay.paid')}>
          <Button label={t('pay.backToOrder')} onPress={onDone} />
        </Stage>
      );
    case 'failed':
      return (
        <Stage
          icon={CircleX}
          tone="error"
          title={t('pay.failedTitle')}
          body={state.message}
          charge={charge}
          amount={amount}
        >
          {again}
        </Stage>
      );
    case 'timed_out':
      return (
        <Stage
          icon={charge.card ? CreditCard : Clock}
          tone="ink"
          title={t(charge.card ? 'pay.cardCancelledTitle' : 'pay.timedOutTitle')}
          body={t(charge.card ? 'pay.cardCancelledBody' : 'pay.timedOutBody')}
          charge={charge}
          amount={amount}
        >
          {again}
        </Stage>
      );
    default:
      return null;
  }
}

/** One centred step: an icon, a heading, a line, what is being paid, then the step's own parts. */
function Stage({
  icon: Icon,
  tone,
  title,
  body,
  charge,
  amount,
  children,
}: {
  icon?: LucideIcon;
  tone: 'ink' | 'success' | 'error';
  title: string;
  body?: string;
  charge?: Charge;
  amount?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const color = { ink: theme.ink, success: theme.success, error: theme.error }[tone];
  const wash = { ink: theme.tint, success: theme.successTint, error: theme.errorTint }[tone];
  return (
    <View style={styles.stage}>
      {Icon ? (
        <View style={[styles.badge, { backgroundColor: wash }]}>
          <Icon size={tokens.space[8]} color={color} />
        </View>
      ) : null}
      <Text variant="display-m" accessibilityRole="header" style={styles.center}>
        {title}
      </Text>
      {body ? (
        <Text variant="body" style={[styles.center, { color: theme.muted }]}>
          {body}
        </Text>
      ) : null}
      {charge && amount ? (
        <View style={[styles.charge, { backgroundColor: theme.surface }]}>
          <View style={styles.flex}>
            <Text variant="body-strong" numberOfLines={1}>
              {charge.method}
            </Text>
            {charge.phone ? (
              <Text variant="caption" style={{ color: theme.muted }}>
                {charge.phone}
              </Text>
            ) : null}
          </View>
          <Text variant="title">{amount}</Text>
        </View>
      ) : null}
      {children}
      {charge?.testMode ? (
        <Text variant="caption" style={[styles.center, { color: theme.meta }]}>
          {t('pay.test')}
        </Text>
      ) : null}
    </View>
  );
}

const BADGE = tokens.space[16] + tokens.space[4];

const styles = StyleSheet.create({
  stage: {
    alignItems: 'stretch',
    gap: tokens.space[4],
    paddingTop: tokens.space[8],
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  center: { textAlign: 'center' },
  charge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  flex: { flex: 1 },
  timer: { alignItems: 'center', gap: tokens.space[2], paddingVertical: tokens.space[2] },
  clock: { fontVariant: ['tabular-nums'] },
  track: {
    alignSelf: 'stretch',
    height: tokens.space[1],
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
    marginTop: tokens.space[2],
  },
  bar: { height: '100%', borderRadius: tokens.radius.full },
});
