import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Grid2x2 } from 'lucide-react-native';
import type { StaffRole } from '@/features/orders';
import { useOwnerSession } from '@/features/session';
import { api } from '@/lib/api';
import type { FloorTable, Order } from '@/lib/api/types';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../chrome/layout';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { ownerKeys } from '../data/keys';
import { ticketAge } from '../desk/ops';
import { EmptyCard } from '../kit';
import { useWaiterCalls } from './calls/useWaiterCalls';
import { FloorBand } from './floor/FloorBand';
import { FloorCard } from './floor/FloorCard';
import { groupTables, toneCounts } from './floor/floorGroups';
import { FreeTile } from './floor/FreeTile';
import { RoomCard } from './floor/RoomCard';
import { TableDetail } from './floor/TableDetail';
import { TablePanel } from './floor/TablePanel';
import { useFloorActions } from './floor/useFloorActions';
import { MarkPaidSheet } from './orders/MarkPaidSheet';
import { useVenuePay } from './orders/useVenuePay';

const LIVE_MS = 5000;
// Minutes since ordering only need to move once every half minute.
const TICK_MS = 30_000;
// The side panel on a desktop: room for a bill and its buttons.
const PANEL = 360;

/**
 * The room, sorted by who needs you: a summary of the room on top, then the tables in three bands
 * (needs you, eating, free). A table that needs someone carries its one action on the card itself,
 * so a call or a bill takes one tap. Desktops show the picked table in a panel beside the room;
 * smaller screens open it in a sheet.
 */
export function FloorScreen() {
  const { t } = useTranslation();
  const { wide, desktop } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = (useOwnerSession((state) => state.role) ?? 'waiter') as StaffRole;
  const [picked, setPicked] = useState<string | null>(null);
  const [paying, setPaying] = useState<Order | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  const client = useQueryClient();
  const actions = useFloorActions(venueId);
  const { venue, methods } = useVenuePay(venueId);
  const { calls } = useWaiterCalls(venueId);

  const floor = useQuery({
    queryKey: ownerKeys.floor(venueId),
    queryFn: () => api.ownerGetFloor(venueId),
    enabled: Boolean(venueId),
    refetchInterval: LIVE_MS,
  });
  // Polled with the floor: a table's details show its bill only once the order is here, so a
  // table that has just ordered must not open with "No open bill".
  const orders = useQuery({
    queryKey: ownerKeys.orders(venueId),
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
    refetchInterval: LIVE_MS,
  });

  const items = floor.data?.items ?? [];
  const orderOf = (table: FloorTable) =>
    orders.data?.items.find((item) => item.id === table.orderId) ?? null;
  const minutesOf = (item: FloorTable) => {
    const order = orderOf(item);
    return order ? ticketAge(order.createdAt, now).minutes : null;
  };
  const table = items.find((item) => item.id === picked) ?? null;
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
        onPress: () => actions.answerCall(id, next),
      };
    }
    const order = orderOf(item);
    if (item.status === 'waiting_to_pay' && order && mayTakePay) {
      return {
        label: t('ownerOrders.markPaid.open'),
        busy: false,
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
      // One sheet at a time: on smaller screens close the table, then ask how it was paid.
      if (!desktop) setPicked(null);
      setPaying(order);
    },
  };

  const room = (
    <View style={styles.room}>
      {groupTables(items).map((group) => (
        <FloorBand
          key={group.id}
          group={group.id}
          count={group.tables.length}
          columns={wide ? 3 : 2}
          compact={group.id === 'free'}
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
    <OwnerPage title={t('owner.floor')} subtitle={t('ownerLead.floor')} width="wide">
      <DeskWait
        loading={floor.isLoading}
        error={floor.isError}
        onRetry={() => void floor.refetch()}
      >
        {items.length === 0 ? (
          <EmptyCard icon={Grid2x2} title={t('owner.emptyFloor')} description={t('ownerLead.floor')} />
        ) : (
          <View style={styles.stack}>
            <RoomCard counts={toneCounts(items)} />
            {desktop ? (
              <View style={styles.split}>
                <View style={styles.main}>{room}</View>
                <View style={styles.panel}>
                  <TablePanel table={table} {...detail} />
                </View>
              </View>
            ) : (
              room
            )}
          </View>
        )}
      </DeskWait>
      {table && !desktop ? (
        <TableDetail table={table} {...detail} onClose={() => setPicked(null)} />
      ) : null}
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
  stack: { gap: tokens.space[6] },
  room: { gap: tokens.space[6] },
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[6] },
  main: { flex: 1, minWidth: 0 },
  panel: { width: PANEL },
});
