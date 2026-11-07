import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { StaffRole } from '@/features/orders';
import { useOwnerSession } from '@/features/session';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { ownerKeys } from '../data/keys';
import { FloorToolbar } from './floor/FloorToolbar';
import { TableDetail } from './floor/TableDetail';
import { TableGrid } from './floor/TableGrid';
import { filterTables, floorCounts, type FloorFilter } from './floor/floorFilter';
import { useFloorActions } from './floor/useFloorActions';

const LIVE_MS = 5000;

/**
 * The room at a glance: filter chips, then every table as a tile across the full page width.
 * Tapping a tile opens that table in a sheet, so there is no side column taking space from the grid.
 */
export function FloorScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = (useOwnerSession((state) => state.role) ?? 'waiter') as StaffRole;
  const [picked, setPicked] = useState<string | null>(null);
  const [filter, setFilter] = useState<FloorFilter>('all');
  const actions = useFloorActions(venueId);

  const floor = useQuery({
    queryKey: ownerKeys.floor(venueId),
    queryFn: () => api.ownerGetFloor(venueId),
    enabled: Boolean(venueId),
    refetchInterval: LIVE_MS,
  });
  // Polled with the floor: a table's sheet shows its bill and actions only once the order is
  // here, so a table that has just ordered must not open with "No open bill".
  const orders = useQuery({
    queryKey: ownerKeys.orders(venueId),
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
    refetchInterval: LIVE_MS,
  });
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const items = floor.data?.items ?? [];
  const shown = filterTables(items, filter);
  const table = items.find((item) => item.id === picked) ?? null;
  const bill = orders.data?.items.find((item) => item.id === table?.orderId) ?? null;
  const currency = venue.data?.currency ?? 'GHS';
  const empty = items.length === 0 ? t('owner.emptyFloor') : t('ownerFloor.noMatch');

  return (
    <OwnerPage title={t('owner.floor')} width="wide">
      <DeskWait
        loading={floor.isLoading}
        error={floor.isError}
        onRetry={() => void floor.refetch()}
      >
        <View style={styles.stack}>
          <FloorToolbar counts={floorCounts(items)} value={filter} onChange={setFilter} />
          {shown.length > 0 ? (
            <TableGrid tables={shown} currency={currency} picked={picked} onPick={setPicked} />
          ) : (
            <Text variant="body" style={{ color: theme.muted }}>
              {empty}
            </Text>
          )}
        </View>
      </DeskWait>
      {table ? (
        <TableDetail
          table={table}
          bill={bill}
          currency={currency}
          role={role}
          actions={actions}
          onClose={() => setPicked(null)}
        />
      ) : null}
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
});
