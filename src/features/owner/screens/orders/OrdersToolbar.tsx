import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { ChipRow, Segmented } from '../../kit';
import { ORDER_FILTERS, type OrderFilter } from '../../desk/orderBoard';

export type OrderLayout = 'board' | 'list';

/**
 * Chips for which orders to show, each with its count, and on the right the Board / List switch
 * (canvas). The board only makes sense for open orders, so the switch hides for the others.
 */
export function OrdersToolbar({
  filter,
  counts,
  onFilter,
  layout,
  onLayout,
}: {
  filter: OrderFilter;
  counts: Record<OrderFilter, number>;
  onFilter: (id: OrderFilter) => void;
  layout: OrderLayout;
  onLayout: (id: OrderLayout) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <View style={styles.chips}>
        <ChipRow<OrderFilter>
          label={t('ownerOrders.range.label')}
          value={filter}
          onChange={onFilter}
          items={ORDER_FILTERS.map((id) => ({
            id,
            label: t(`ownerOrders.tabs.${id}`),
            count: counts[id],
          }))}
        />
      </View>
      {filter === 'open' ? (
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
