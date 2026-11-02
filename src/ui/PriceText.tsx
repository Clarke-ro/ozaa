import { formatCedis } from '@/lib/money';
import { pesewas } from '@/lib/brand';
import { Text } from './Text';

export function PriceText({
  amount,
  size = 'body',
}: {
  amount: number;
  size?: 'body' | 'title';
}) {
  return (
    <Text variant={size === 'title' ? 'title' : 'body-strong'} style={{ fontVariant: ['tabular-nums'] }}>
      {formatCedis(pesewas(amount))}
    </Text>
  );
}
