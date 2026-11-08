import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Order } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../../chrome/layout';
import { gridRows } from './gridRows';

/**
 * Tickets in equal columns: three across on a desktop, two on a tablet, one on a phone.
 * Built as rows so every card in a column has the same width and the gaps stay even.
 */
export function TicketGrid({
  orders,
  renderTicket,
}: {
  orders: readonly Order[];
  renderTicket: (order: Order) => ReactNode;
}) {
  const { wide, desktop } = useOwnerLayout();
  const columns = desktop ? 3 : wide ? 2 : 1;
  return (
    <View style={styles.grid}>
      {gridRows(orders, columns).map((row, index) => (
        <View key={row[0]?.id ?? index} style={styles.row}>
          {row.map((order, cell) => (
            <View key={order?.id ?? `empty-${cell}`} style={styles.cell}>
              {order ? renderTicket(order) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: tokens.space[3] },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] },
  // flexBasis 0 makes every cell the same width, whatever is inside it.
  cell: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
});
