import { makeStyles } from '@/ui/makeStyles';
import { useState } from 'react';
import { View, useWindowDimensions, type DimensionValue } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { Bell, Grid2x2 } from 'lucide-react-native';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { nextOrderMove, type OrderStatus, type StaffRole } from '@/features/orders';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { FloorTile } from './floor/FloorTile';
import { ChipRow, DeskCard, StatusPill } from '../kit';
import { ownerKeys } from '../data/keys';

const LABEL = {
  free: 'owner.free',
  seated: 'owner.seated',
  ordered: 'owner.ordered',
  waiting_to_pay: 'owner.waitingPay',
  needs_waiter: 'owner.needsWaiter',
} as const;

const MOVE_LABEL = {
  start: 'owner.start',
  ready: 'owner.markReady',
  serve: 'owner.markServed',
} as const;

type FilterType = 'all' | 'needs_waiter' | 'waiting_to_pay' | 'active' | 'free';

const SPLIT_AT = 920;

export function FloorScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= SPLIT_AT;
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = (useOwnerSession((state) => state.role) ?? 'waiter') as StaffRole;
  const client = useQueryClient();

  const [picked, setPicked] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const floor = useQuery({
    queryKey: ownerKeys.floor(venueId),
    queryFn: () => api.ownerGetFloor(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });

  const orders = useQuery({
    queryKey: ownerKeys.orders(venueId),
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
  });

  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ownerKeys.floor(venueId) });
    void client.invalidateQueries({ queryKey: ownerKeys.orders(venueId) });
    void client.invalidateQueries({ queryKey: ownerKeys.dashboard(venueId) });
  };

  const status = useMutation({
    mutationFn: (input: { id: string; next: OrderStatus }) =>
      api.ownerSetOrderStatus(input.id, { status: input.next }),
    onSuccess: refresh,
  });

  const cash = useMutation({
    mutationFn: (input: { id: string; amount: number }) =>
      api.ownerRecordCashPayment(
        input.id,
        { amountPesewas: input.amount },
        { idempotencyKey: Crypto.randomUUID() },
      ),
    onSuccess: refresh,
  });

  const call = useMutation({
    mutationFn: (input: { id: string; status: 'acknowledged' | 'resolved' }) =>
      api.ownerUpdateWaiterCall(input.id, { status: input.status }),
    onSuccess: refresh,
  });

  const items = floor.data?.items ?? [];
  const table = items.find((item) => item.id === picked) ?? (wide ? items[0] ?? null : null);
  const bill = orders.data?.items.find((item) => item.id === table?.orderId) ?? null;
  const currency = venue.data?.currency ?? 'GHS';
  const columns = width >= 1180 ? 4 : width >= 680 ? 3 : 2;

  const filteredTables = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'active') return item.status !== 'free';
    return item.status === filter;
  });

  const filterChips = [
    { id: 'all' as const, label: t('ownerFloor.filter.all', { count: items.length }) },
    {
      id: 'needs_waiter' as const,
      label: t('ownerFloor.filter.calls', {
        count: items.filter((i) => i.status === 'needs_waiter').length,
      }),
    },
    {
      id: 'waiting_to_pay' as const,
      label: t('ownerFloor.filter.paying', {
        count: items.filter((i) => i.status === 'waiting_to_pay').length,
      }),
    },
    {
      id: 'active' as const,
      label: t('ownerFloor.filter.active', {
        count: items.filter((i) => i.status !== 'free').length,
      }),
    },
    {
      id: 'free' as const,
      label: t('ownerFloor.filter.free', {
        count: items.filter((i) => i.status === 'free').length,
      }),
    },
  ];

  const detailCard = table ? (
    <DeskCard style={styles.tableDetailCard}>
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleCol}>
          <Text variant="title">
            {table.label || t('ownerFloor.tableCode', { code: table.code })}
          </Text>
          <StatusPill
            label={t(LABEL[table.status])}
            tone={
              table.status === 'needs_waiter'
                ? 'error'
                : table.status === 'waiting_to_pay'
                  ? 'waiting'
                  : table.status === 'free'
                    ? 'neutral'
                    : 'accent'
            }
          />
        </View>

        {table.billPesewas != null ? (
          <Text variant="title" style={[styles.totalPrice, { fontVariant: ['tabular-nums'] }]}>
            {formatMoney(
              pesewas(
                Math.max(
                  0,
                  bill ? bill.totalPesewas - (PAYMENTS_ENABLED ? bill.paidPesewas : 0) : 0,
                ),
              ),
              currency,
            )}
          </Text>
        ) : null}
      </View>

      {table.waiterReason ? (
        <View style={[styles.callNotice, { backgroundColor: theme.tint }]}>
          <Bell size={18} color={theme.ink} />
          <Text variant="body-strong" style={{ color: theme.ink, flex: 1 }}>
            {t('ownerFloor.guestRequested', {
              reason: t(`waiter.reasons.${table.waiterReason}`),
            })}
          </Text>
        </View>
      ) : null}

      {bill?.lines && bill.lines.length > 0 ? (
        <View style={styles.billLines}>
          {bill.lines.map((line) => (
            <View key={line.id} style={styles.orderLineRow}>
              <Text variant="body" style={styles.qtyText}>
                {line.quantity}×
              </Text>
              <Text variant="body" style={{ flex: 1 }}>
                {line.name}
              </Text>
              <Text variant="body" style={{ fontVariant: ['tabular-nums'] }}>
                {formatMoney(pesewas(line.totalPesewas), currency)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="body" style={{ color: theme.muted }}>
          {t('owner.noBill')}
        </Text>
      )}

      <View style={styles.detailActions}>
        {table.waiterCallId ? (
          <View style={styles.buttonRow}>
            <Button
              label={t('owner.onTheWay')}
              tone="primary"
              onPress={() => call.mutate({ id: table.waiterCallId!, status: 'acknowledged' })}
              loading={call.isPending}
              style={{ flex: 1 }}
            />
            <Button
              label={
                !PAYMENTS_ENABLED && table.waiterReason === 'bill'
                  ? t('owner.billSettled')
                  : t('owner.doneCall')
              }
              tone="secondary"
              onPress={() => call.mutate({ id: table.waiterCallId!, status: 'resolved' })}
              loading={call.isPending}
            />
          </View>
        ) : null}

        {PAYMENTS_ENABLED && bill && table.orderId && table.status === 'waiting_to_pay' ? (
          <Button
            label={t('owner.cash')}
            tone="primary"
            onPress={() =>
              cash.mutate({
                id: table.orderId!,
                amount: Math.max(0, bill.totalPesewas - bill.paidPesewas),
              })
            }
            loading={cash.isPending}
          />
        ) : null}

        {bill &&
        table.orderId &&
        table.orderStatus &&
        nextOrderMove(table.orderStatus as OrderStatus, role) ? (
          <Button
            label={t(
              nextOrderMove(table.orderStatus as OrderStatus, role)!.move === 'start'
                ? MOVE_LABEL.start
                : nextOrderMove(table.orderStatus as OrderStatus, role)!.move === 'ready'
                  ? MOVE_LABEL.ready
                  : MOVE_LABEL.serve,
            )}
            tone="secondary"
            onPress={() => {
              const next = nextOrderMove(table.orderStatus as OrderStatus, role);
              if (next && table.orderId) {
                status.mutate({ id: table.orderId, next: next.status });
              }
            }}
            loading={status.isPending}
          />
        ) : null}
      </View>
    </DeskCard>
  ) : wide ? (
    <DeskCard style={styles.emptyInspector}>
      <Grid2x2 size={24} color={theme.muted} />
      <Text variant="body" style={{ color: theme.muted }}>
        {t('ownerFloor.selectTable')}
      </Text>
    </DeskCard>
  ) : null;

  return (
    <OwnerPage title={t('owner.floor')}>
      <DeskWait
        loading={floor.isLoading}
        error={floor.isError}
        onRetry={() => void floor.refetch()}
      >
        <View style={styles.stack}>
          <ChipRow items={filterChips} value={filter} onChange={setFilter} />

          {items.length === 0 ? (
            <Text variant="body" style={{ color: theme.muted }}>
              {t('owner.emptyFloor')}
            </Text>
          ) : wide ? (
            <View style={styles.split}>
              <View style={styles.gridCol}>
                <View style={styles.grid}>
                  {filteredTables.map((item) => (
                    <View
                      key={item.id}
                      style={{ width: `${100 / columns - 2.2}%` as DimensionValue }}
                    >
                      <FloorTile
                        code={item.code}
                        label={item.label}
                        status={item.status}
                        billPesewas={item.billPesewas}
                        currency={currency}
                        selected={table?.id === item.id}
                        onPress={() => setPicked(item.id)}
                      />
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.inspectorCol}>{detailCard}</View>
            </View>
          ) : (
            <>
              <View style={styles.grid}>
                {filteredTables.map((item) => (
                  <View
                    key={item.id}
                    style={{ width: `${100 / columns - 2.5}%` as DimensionValue }}
                  >
                    <FloorTile
                      code={item.code}
                      label={item.label}
                      status={item.status}
                      billPesewas={item.billPesewas}
                      currency={currency}
                      selected={table?.id === item.id}
                      onPress={() => setPicked(item.id)}
                    />
                  </View>
                ))}
              </View>
              {detailCard}
            </>
          )}
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const useStyles = makeStyles((theme) => ({
  stack: { gap: tokens.space[4] },
  split: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[5],
  },
  gridCol: {
    flex: 1,
    minWidth: 0,
  },
  inspectorCol: {
    width: 360,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[3],
  },
  tableDetailCard: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  emptyInspector: {
    padding: tokens.space[6],
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
    gap: tokens.space[2],
  },
  detailTitleCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: tokens.space[1],
  },
  totalPrice: {
    fontSize: 20,
  },
  callNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
  billLines: {
    gap: tokens.space[2],
    paddingVertical: tokens.space[1],
  },
  orderLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  qtyText: { fontFamily: fontFamily.strong, minWidth: 28, fontVariant: ['tabular-nums'] },
  detailActions: {
    gap: tokens.space[2],
    paddingTop: tokens.space[2],
    borderTopWidth: 1,
    borderTopColor: theme.line,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
}));
