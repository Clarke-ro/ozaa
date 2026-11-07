import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, MessageSquareText } from 'lucide-react-native';
import type { Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { CodeTile, StatusPill, type PillTone } from '../../kit';
import type { TicketAge } from '../../desk/ops';
import { AGE_TONE, orderPlace, waitedLabel } from './orderPlace';

const STATUS_TONE: Record<Order['status'], PillTone> = {
  received: 'waiting',
  preparing: 'accent',
  ready: 'success',
  served: 'neutral',
  cancelled: 'error',
};

/** The always-visible line of a ticket: where it goes, number and time, wait or status, total. */
export function OrderCardHead({
  order,
  currency,
  age,
  live,
  open,
  onToggle,
}: {
  order: Order;
  currency: string;
  age: TicketAge;
  live: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const hasNote = order.lines.some((line) => Boolean(line.note));
  const time = new Date(order.createdAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  });
  // Table orders show the table; menu-link orders say pickup or delivery, and who for.
  const { where, tile } = orderPlace(order, t);
  const items = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityHint={t(open ? 'ownerOrders.hideDetails' : 'ownerOrders.showDetails')}
      onPress={onToggle}
      style={styles.head}
    >
      <CodeTile
        code={tile}
        size={tokens.touchTarget}
        tone={order.status === 'received' ? 'tint' : 'wash'}
      />
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text variant="body-strong" numberOfLines={1} style={styles.shrink}>
            {where}
          </Text>
          {hasNote ? <MessageSquareText size={16} color={theme.muted} /> : null}
        </View>
        <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
          #{order.number} · {time} · {t('ownerOrders.items', { count: items })}
        </Text>
      </View>
      <View style={styles.side}>
        {live ? (
          <View accessibilityLabel={t('ownerOrders.waitedLabel', { count: age.minutes })}>
            <StatusPill label={waitedLabel(age.minutes, t)} tone={AGE_TONE[age.tone]} boxed />
          </View>
        ) : (
          <StatusPill
            label={t(`statusLabel.${order.status}`)}
            tone={STATUS_TONE[order.status]}
            boxed
          />
        )}
        <Text variant="body-strong" style={styles.num}>
          {formatMoney(pesewas(order.totalPesewas), currency)}
        </Text>
      </View>
      <Chevron size={20} color={theme.meta} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.space[12],
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  shrink: { flexShrink: 1 },
  side: { alignItems: 'flex-end', gap: tokens.space[1] },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
});
