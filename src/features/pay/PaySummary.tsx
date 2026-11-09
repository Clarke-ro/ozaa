import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PriceText } from '@/ui/PriceText';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { payStyles } from './payStyles';

/** Your share, the tip, and what you'll pay: the last card before the Pay button. */
export function PaySummary({
  share,
  tip,
  due,
  currency,
}: {
  share: number;
  tip: number;
  due: number;
  currency: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[payStyles.card, { backgroundColor: theme.surface }]}>
      <SumRow label={t('pay.yourShare')} amount={share} currency={currency} />
      <SumRow label={t('pay.tipLine')} amount={tip} currency={currency} />
      <View style={[payStyles.line, payStyles.total, { borderColor: theme.line }]}>
        <Text variant="body-strong" style={payStyles.flex}>
          {t('pay.due')}
        </Text>
        <PriceText amount={due} currency={currency} size="title" />
      </View>
    </View>
  );
}

function SumRow({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  const theme = useTheme();
  return (
    <View style={payStyles.line}>
      <Text variant="body" style={[payStyles.flex, { color: theme.muted }]}>
        {label}
      </Text>
      <PriceText amount={amount} currency={currency} />
    </View>
  );
}
