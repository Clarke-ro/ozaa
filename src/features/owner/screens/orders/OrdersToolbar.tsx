import { useTranslation } from 'react-i18next';
import { FilterChips } from '@/ui/FilterChips';
import { ORDER_VIEWS, type OrderView } from '../../desk/ops';

/**
 * The one row of chips above the tickets: which stage, each with its count. The dates live in
 * the dropdown in the page header, so there is never a second row of chips.
 */
export function OrdersToolbar({
  tab,
  counts,
  onTab,
}: {
  tab: OrderView;
  counts: Record<OrderView, number>;
  onTab: (id: OrderView) => void;
}) {
  const { t } = useTranslation();
  return (
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
  );
}
