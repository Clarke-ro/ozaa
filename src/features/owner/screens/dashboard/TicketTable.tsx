import { StyleSheet, View } from 'react-native';
import { ClipboardList } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { Stage } from './kitchenFlow';
import { StageBar } from './StageBar';
import { TicketRow } from './TicketRow';

type Move = {
  label: (order: Order) => string | null;
  busy: (order: Order) => boolean;
  run: (order: Order) => void;
};

/**
 * Live orders under its heading: the stage counts, then the oldest open tickets as ruled lines
 * on the page (no box around them), or one calm line when the kitchen is quiet.
 */
export function TicketTable({
  stages,
  orders,
  currency,
  now,
  wide,
  move,
  onOpen,
}: {
  stages: Stage[];
  orders: Order[];
  currency: string;
  now: number;
  wide: boolean;
  move: Move;
  /** Missing when this person may not open Orders. */
  onOpen?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.block}>
      <StageBar stages={stages} />
      {orders.length === 0 ? (
        <View style={styles.quiet}>
          <ClipboardList size={20} color={theme.meta} />
          <Text variant="body" style={{ color: theme.muted }}>
            {t('ownerDash.noLiveOrders')}
          </Text>
        </View>
      ) : (
        <View>
          {orders.map((order) => (
            <TicketRow
              key={order.id}
              order={order}
              currency={currency}
              now={now}
              wide={wide}
              next={move.label(order)}
              busy={move.busy(order)}
              onNext={() => move.run(order)}
              onOpen={onOpen}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: tokens.space[3] },
  quiet: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
});
