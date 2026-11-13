import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import { STATUS_TONES, type StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { BOARD_COLUMNS, boardColumns, type BoardColumn } from '../../desk/orderBoard';

const COLUMN_TONE: Record<BoardColumn, StatusTone> = {
  new: 'order',
  cooking: 'info',
  ready: 'success',
};

/**
 * The kitchen board from the design canvas: New, Cooking and Ready side by side, each headed by
 * its name, a count in the stage colour and a 3 px line. Phones stack the columns.
 */
export function OrderBoard({
  orders,
  side,
  renderCard,
}: {
  orders: readonly Order[];
  /** True when there is room for the three columns side by side. */
  side: boolean;
  renderCard: (order: Order) => ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const cols = boardColumns(orders);
  return (
    <View style={side ? styles.row : styles.stack}>
      {BOARD_COLUMNS.map((id) => {
        const tone = STATUS_TONES[theme.scheme][COLUMN_TONE[id]];
        const stage = t(`ownerOrders.tabs.${id}`);
        const list = cols[id];
        return (
          <View
            key={id}
            accessibilityLabel={t('ownerOrders.columnLabel', { stage, count: list.length })}
            style={[styles.column, side && styles.flex]}
          >
            <View style={[styles.head, { borderBottomColor: tone.line }]}>
              <Text accessibilityRole="header" style={styles.title}>
                {stage}
              </Text>
              <View style={[styles.count, { backgroundColor: tone.bg }]}>
                <Text style={[styles.countText, { color: tone.ink }]}>{list.length}</Text>
              </View>
            </View>
            {list.length === 0 ? (
              <Text style={[styles.empty, { color: theme.meta }]}>
                {t(`ownerOrders.empty.${id}`)}
              </Text>
            ) : (
              list.map((order) => <View key={order.id}>{renderCard(order)}</View>)
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[6] },
  stack: { gap: tokens.space[8] },
  flex: { flex: 1, minWidth: 0 },
  column: { gap: tokens.space[4] },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: tokens.space[3],
    borderBottomWidth: 3,
  },
  title: {
    flex: 1,
    fontSize: tokens.owner.type.title.size,
    lineHeight: tokens.owner.type.title.line,
    fontFamily: fontFamily.strong,
  },
  count: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 9,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 14, lineHeight: 18, fontFamily: fontFamily.strong },
  empty: { fontSize: 14, lineHeight: 20, paddingVertical: tokens.space[2] },
});
