import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { pesewas } from '@/lib/brand';
import { Text } from './Text';

export function PriceText({
  amount,
  currency = DEFAULT_CURRENCY,
  size = 'body',
}: {
  amount: number;
  currency?: string;
  size?: 'body' | 'title';
}) {
  return (
    <Text
      variant={size === 'title' ? 'title' : 'body-strong'}
      style={{ fontVariant: ['tabular-nums'] }}
    >
      {formatMoney(pesewas(amount), currency)}
    </Text>
  );
}
