import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { ChipRow, Segmented } from '../../kit';
import type { OrderFilter } from '../../desk/orderBoard';

export type OrderLayout = 'board' | 'list';

/**
 * Chips for which orders to show, each with its count, and on the right the Board / List switch
 * (canvas). The board only makes sense for open orders, so the switch hides for the others.
 */
export function OrdersToolbar({
  filter,
  filters,
  counts,
  onFilter,
  layout,
  onLayout,
}: {
  filter: OrderFilter;
  /** Which chips to show, in order: the board's on wide screens, the stages on phones. */
  filters: readonly OrderFilter[];
  counts: Record<OrderFilter, number>;
  onFilter: (id: OrderFilter) => void;
  layout: OrderLayout;
  /** Missing on phones, which always show the board for open orders. */
  onLayout?: (id: OrderLayout) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <View style={styles.chips}>
        <ChipRow<OrderFilter>
          label={t('ownerOrders.range.label')}
          value={filter}
          onChange={onFilter}
          items={filters.map((id) => ({
            id,
            label: t(`ownerOrders.tabs.${id}`),
            count: counts[id],
          }))}
        />
      </View>
      {filter === 'open' && onLayout ? (
        <View style={styles.end}>
          <Segmented<OrderLayout>
            label={t('ownerOrders.view.label')}
            value={layout}
            onChange={onLayout}
            options={[
              { id: 'board', label: t('ownerOrders.view.board') },
              { id: 'list', label: t('ownerOrders.view.list') },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[3] },
  chips: { flexShrink: 1, minWidth: 0 },
  end: { marginLeft: 'auto' },
});
