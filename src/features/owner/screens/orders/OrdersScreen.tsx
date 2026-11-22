import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import {
  ORDER_FILTERS,
  PHONE_FILTERS,
  filterCounts,
  inFilter,
  type OrderFilter,
} from '../../desk/orderBoard';
import { ORDER_RANGES, type OrderRange } from '../../desk/orderRange';
import { CardGrid, EmptyCard, HeaderAdd, PeriodSelect } from '../../kit';
import { CreateOrderSheet } from './CreateOrderSheet';
import { OrderBoard } from './OrderBoard';
import { OrdersToolbar, type OrderLayout } from './OrdersToolbar';
import { useOrderDesk } from './useOrderDesk';

/**
 * Kitchen tickets. Wide screens: "Open" shows the board (New, Cooking and Ready side by side, each
 * with an arrow to see them all); Served, Rejected and All are lists. Phones have no board: one row
 * of chips (New, Cooking, Ready, Served, Rejected, All) and the tickets of the picked one under it.
 * A card shows the dishes and only the next step this person may take; tapping it opens the order.
 */
export function OrdersScreen() {
  const { t } = useTranslation();
  const { wide, desktop } = useOwnerLayout();
  const [picked, setPicked] = useState<OrderFilter | null>(null);
  // Each layout starts on its own first chip and ignores one that only the other has.
  const filters = wide ? ORDER_FILTERS : PHONE_FILTERS;
  const filter = picked && filters.includes(picked) ? picked : (filters[0] ?? 'all');
  const [layout, setLayout] = useState<OrderLayout>('board');
  const [range, setRange] = useState<OrderRange>('today');
  const [creating, setCreating] = useState(false);
  const desk = useOrderDesk(range, !wide);
  const venue = desk.venue.data;

  const all = desk.orders.data?.items ?? [];
  const counts = filterCounts(all);
  const live = filter === 'open' || filter === 'new' || filter === 'cooking' || filter === 'ready';
  const board = wide && filter === 'open' && layout === 'board';
  // Oldest first while still in the kitchen (who has waited longest), newest first once done.
  const shown = all
    .filter((o) => inFilter(o.status, filter))
    .sort((a, b) =>
      !live ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt),
    );
  const create = () => setCreating(true);

  return (
    <OwnerPage
      title={t('owner.orders')}
      subtitle={t('ownerOrders.lead')}
      width="wide"
      action={
        <View style={styles.actions}>
          <PeriodSelect<OrderRange>
            label={t('ownerOrders.range.label')}
            value={range}
            onChange={setRange}
            options={ORDER_RANGES.map((id) => ({ id, label: t(`ownerOrders.range.${id}`) }))}
          />
          {desk.canCreate && venue ? (
            <HeaderAdd label={t('ownerOrders.create.open')} onPress={create} />
          ) : null}
        </View>
      }
    >
      <OrdersToolbar
        filter={filter}
        filters={filters}
        // No numbers until the orders have loaded: offline, "New 0" would say the kitchen is clear.
        counts={desk.orders.data ? counts : undefined}
        onFilter={setPicked}
        layout={layout}
        onLayout={wide ? setLayout : undefined}
      />
      <DeskWait
        loading={desk.orders.isPending}
        error={desk.orders.isError}
        onRetry={() => void desk.orders.refetch()}
      >
        {shown.length === 0 ? (
          <EmptyCard
            icon={ClipboardList}
            title={t(`ownerOrders.empty.${filter}`)}
            description={t('ownerOrders.emptyBody')}
          />
        ) : board ? (
          <OrderBoard orders={shown} side={wide} renderCard={desk.card} />
        ) : (
          <CardGrid columns={desktop ? 3 : wide ? 2 : 1}>{shown.map(desk.card)}</CardGrid>
        )}
      </DeskWait>
      {desk.paySheet}
      {creating && venue ? (
        <CreateOrderSheet
          venueId={desk.venueId}
          slug={venue.slug}
          currency={venue.currency}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
});
