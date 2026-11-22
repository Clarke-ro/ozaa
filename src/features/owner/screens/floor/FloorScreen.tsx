import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Grid2x2 } from 'lucide-react-native';
import type { StaffRole } from '@/features/orders';
import { useOwnerSession } from '@/features/session';
import { api } from '@/lib/api';
import type { FloorTable, Order } from '@/lib/api/types';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { ticketAge } from '../../desk/ops';
import { ChipRow, EmptyCard } from '../../kit';
import type { StatusTone } from '@/theme/palette';
import { useWaiterCalls } from '../calls/useWaiterCalls';
import { FloorBand } from './FloorBand';
import { FloorCard } from './FloorCard';
import {
  FLOOR_FILTERS,
  floorFilterCounts,
  groupTables,
  inFloorFilter,
  tablesInUse,
  type FloorFilter,
} from './floorGroups';
import { FreeTile } from './FreeTile';
import { TableDetail } from './TableDetail';
import { useFloorActions } from './useFloorActions';
import { MarkPaidSheet } from '../orders/MarkPaidSheet';
import { useVenuePay } from '../orders/useVenuePay';
import { POLL_MS } from '@/lib/polling';
import { useNow } from '@/lib/useNow';

// Minutes since ordering only need to move once every half minute.
const TICK_MS = 30_000;
// Chip count colours from the canvas: calls red, eating blue, bills amber, free green.
const FILTER_TONE: Partial<Record<FloorFilter, StatusTone>> = {
  calling: 'alert',
  eating: 'info',
  paying: 'bill',
  free: 'success',
};

/**
 * The room, as on the design canvas: "5 of 9 tables in use" under the title, chips to show one
 * kind of table, then the tables in three bands (needs you, eating, free). A table that needs
 * someone carries its one action on the card as a tinted button, so a call or a bill takes one
 * tap. Tapping a table opens its bill in a sheet.
 */
export function FloorScreen() {
  const { t } = useTranslation();
  const { wide, desktop } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = (useOwnerSession((state) => state.role) ?? 'waiter') as StaffRole;
  // A link like /owner/floor?table=tbl_4 (from a notification) opens that table straight away.
  const params = useLocalSearchParams<{ table?: string }>();
  const [picked, setPicked] = useState<string | null>(params.table ?? null);
  const [filter, setFilter] = useState<FloorFilter>('all');
  const [paying, setPaying] = useState<Order | null>(null);
  const now = useNow(TICK_MS);
  const client = useQueryClient();
  const actions = useFloorActions(venueId);
  const { venue, methods } = useVenuePay(venueId);
  const { calls } = useWaiterCalls(venueId);

  const floor = useQuery({
    queryKey: ownerKeys.floor(venueId),
    queryFn: () => api.ownerGetFloor(venueId),
    enabled: Boolean(venueId),
    refetchInterval: POLL_MS.owner,
  });
  // Polled with the floor: a table's details show its bill only once the order is here, so a
  // table that has just ordered must not open with "No open bill".
  const orders = useQuery({
    queryKey: ownerKeys.orders(venueId),
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
    refetchInterval: POLL_MS.owner,
  });

  const items = floor.data?.items ?? [];
  const counts = floorFilterCounts(items);
  const orderOf = (table: FloorTable) =>
    orders.data?.items.find((item) => item.id === table.orderId) ?? null;
  // How long the table has been like this, from the server: since the call, or since the order moved.
  const minutesOf = (item: FloorTable) => {
    if (item.since) return ticketAge(item.since, now).minutes;
    const order = orderOf(item);
    return order ? ticketAge(order.createdAt, now).minutes : null;
  };
  const table = items.find((item) => item.id === picked || item.code === picked) ?? null;
  const bill = table ? orderOf(table) : null;
  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const mayTakePay = role === 'owner' || role === 'manager' || role === 'waiter';

  // The one thing to do at a table that needs someone, right on its card.
  const quickFor = (item: FloorTable) => {
    if (item.status === 'needs_waiter' && item.waiterCallId) {
      const id = item.waiterCallId;
      const call = calls.data?.items.find((c) => c.id === id);
      const next = call?.status === 'acknowledged' ? 'resolved' : 'acknowledged';
      return {
        label: next === 'acknowledged' ? t('owner.onTheWay') : t('owner.doneCall'),
        busy: actions.answering,
        tint: 'alert' as const,
        onPress: () => actions.answerCall(id, next),
      };
    }
    const order = orderOf(item);
    if (item.status === 'waiting_to_pay' && order && mayTakePay) {
      return {
        label: t('ownerOrders.markPaid.open'),
        busy: false,
        tint: 'bill' as const,
        onPress: () => setPaying(order),
      };
    }
    return undefined;
  };

  const detail = {
    bill,
    currency,
    role,
    actions,
    onMarkPaid: (order: Order) => {
      // One sheet at a time: close the table, then ask how it was paid.
      setPicked(null);
      setPaying(order);
    },
  };

  const room = (
    <View style={styles.room}>
      {groupTables(items.filter((item) => inFloorFilter(item.status, filter))).map((group) => (
        <FloorBand
          key={group.id}
          group={group.id}
          count={group.tables.length}
          // Canvas grids: calls get wider cards (3 across), eating and free tables 4 across.
          columns={
            desktop
              ? group.id === 'attention'
                ? 3
                : 4
              : wide
                ? 2
                : group.id === 'attention'
                  ? 1
                  : 2
          }
        >
          {group.tables.map((item) =>
            group.id === 'free' ? (
              <FreeTile
                key={item.id}
                code={item.code}
                label={item.label}
                selected={picked === item.id}
                onPress={() => setPicked(item.id)}
              />
            ) : (
              <FloorCard
                key={item.id}
                table={item}
                minutes={minutesOf(item)}
                currency={currency}
                selected={picked === item.id}
                onPress={() => setPicked(item.id)}
                quick={quickFor(item)}
              />
            ),
          )}
        </FloorBand>
      ))}
    </View>
  );

  return (
    <OwnerPage
      title={t('owner.floor')}
      subtitle={
        items.length > 0
          ? t('ownerFloor.inUseLead', { count: tablesInUse(items), total: items.length })
          : t('ownerLead.floor')
      }
    >
      <DeskWait
        loading={floor.isPending}
        error={floor.isError}
        onRetry={() => void floor.refetch()}
      >
        {items.length === 0 ? (
          <EmptyCard
            icon={Grid2x2}
            title={t('owner.emptyFloor')}
            description={t('ownerLead.floor')}
          />
        ) : (
          <View style={styles.stack}>
            <ChipRow<FloorFilter>
              label={t('ownerFloor.filter.label')}
              value={filter}
              onChange={setFilter}
              items={FLOOR_FILTERS.map((id) => ({
                id,
                label: t(`ownerFloor.filter.${id}`),
                count: counts[id],
                tone: FILTER_TONE[id],
              }))}
            />
            {room}
          </View>
        )}
      </DeskWait>
      {table ? <TableDetail table={table} {...detail} onClose={() => setPicked(null)} /> : null}
      {paying ? (
        <MarkPaidSheet
          order={paying}
          venueId={venueId}
          methods={methods}
          currency={currency}
          onClose={() => {
            setPaying(null);
            void client.invalidateQueries({ queryKey: ownerKeys.floor(venueId) });
          }}
        />
      ) : null}
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  // Canvas: 24 px more between the chips and each band than the page's 32 px section gap.
  stack: { gap: tokens.space[12] + tokens.space[2] },
  room: { gap: tokens.space[12] + tokens.space[2] },
});
