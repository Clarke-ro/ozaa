import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard, type LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { StatusPill, cardStyle, type PillTone } from '../../kit';

/**
 * The two ways guests pay, one card each: in person is always on; Paystack is on once the venue
 * connects its own account (the footer's Connect Paystack button).
 */
export function PaymentsStep({ paystack }: { paystack: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <PayCard
        icon={Banknote}
        label={t('ownerSetup.pay.inPerson')}
        state={t('ownerSetup.pay.on')}
        tone="success"
      />
      <PayCard
        icon={CreditCard}
        label={t('ownerSetup.pay.online')}
        state={t(paystack ? 'ownerSetup.pay.connected' : 'ownerSetup.pay.notConnected')}
        tone={paystack ? 'success' : 'neutral'}
      />
    </>
  );
}

function PayCard({
  icon: Icon,
  label,
  state,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  state: string;
  tone: PillTone;
}) {
  const theme = useTheme();
  return (
    <View
      style={[cardStyle(theme), styles.card]}
      accessible
      accessibilityLabel={`${label}, ${state}`}
    >
      <Icon size={22} color={theme.ink} />
      <Text variant="body-strong" style={styles.label}>
        {label}
      </Text>
      <StatusPill label={state} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
    minHeight: tokens.touchTarget + tokens.space[4],
    borderRadius: tokens.radius.lg,
  },
  label: { flex: 1 },
});
