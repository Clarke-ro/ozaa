import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react-native';
import { FilterChips } from '@/ui/FilterChips';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { ORDER_VIEWS, type OrderView } from '../../desk/ops';
import { ORDER_RANGES, type OrderRange } from '../../desk/orderRange';

/**
 * The two filters above the tickets: which stage, and which dates. Wide screens put them on one
 * line (stage on the left, dates on the right) so the tickets start higher; phones stack them.
 */
export function OrdersToolbar({
  tab,
  counts,
  onTab,
  range,
  onRange,
}: {
  tab: OrderView;
  counts: Record<OrderView, number>;
  onTab: (id: OrderView) => void;
  range: OrderRange;
  onRange: (id: OrderRange) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { wide } = useOwnerLayout();
  return (
    <View style={wide ? styles.row : styles.stack}>
      <View style={wide && styles.stages}>
        <FilterChips<OrderView>
          label={t('owner.orders')}
          value={tab}
          onChange={onTab}
          items={ORDER_VIEWS.map((id) => ({
            id,
            label: t(`ownerOrders.tabs.${id}`),
            count: counts[id],
          }))}
        />
      </View>
      <View style={[styles.range, wide && styles.rangeWide]}>
        <CalendarDays size={20} color={theme.meta} />
        <View style={styles.shrink}>
          <FilterChips<OrderRange>
            label={t('ownerOrders.range.label')}
            value={range}
            onChange={onRange}
            items={ORDER_RANGES.map((id) => ({ id, label: t(`ownerOrders.range.${id}`) }))}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[6] },
  // Both rows scroll sideways on their own when the window is too narrow for every chip.
  stages: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  range: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  rangeWide: { flexShrink: 1, minWidth: 0 },
  shrink: { flexShrink: 1, minWidth: 0 },
});
