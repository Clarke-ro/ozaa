import { useTranslation } from 'react-i18next';
import { DeskTabs } from '../../kit';
import { ORDER_VIEWS, type OrderView } from '../../desk/ops';

/**
 * The stages as underlined tabs, each with its count, the same tabs as Calls. The dates live in
 * the dropdown in the page header, so there is only ever one row of choices.
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
    <DeskTabs<OrderView>
      value={tab}
      onChange={onTab}
      tabs={ORDER_VIEWS.map((id) => ({
        id,
        label: t(`ownerOrders.tabs.${id}`),
        count: counts[id],
      }))}
    />
  );
}
