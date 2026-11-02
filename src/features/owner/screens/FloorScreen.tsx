import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type DimensionValue } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { Bell } from 'lucide-react-native';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { nextOrderMove, type OrderStatus, type StaffRole } from '@/features/orders';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { ChipRow, DeskCard, StatusPill } from '../kit';

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

export function FloorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = (useOwnerSession((state) => state.role) ?? 'waiter') as StaffRole;
  const client = useQueryClient();

  const [picked, setPicked] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const floor = useQuery({
    queryKey: ['owner-floor', venueId],
    queryFn: () => api.ownerGetFloor(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });

  const orders = useQuery({
    queryKey: ['owner-orders', venueId],
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
  });

  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['owner-floor', venueId] });
    void client.invalidateQueries({ queryKey: ['owner-orders', venueId] });
    void client.invalidateQueries({ queryKey: ['owner-dashboard', venueId] });
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
        { idempotencyKey: Crypto.randomUUID() }
      ),
    onSuccess: refresh,
  });

  const call = useMutation({
    mutationFn: (input: { id: string; status: 'acknowledged' | 'resolved' }) =>
      api.ownerUpdateWaiterCall(input.id, { status: input.status }),
    onSuccess: refresh,
  });

  const items = floor.data?.items ?? [];
  const table = items.find((item) => item.id === picked) ?? null;
  const bill = orders.data?.items.find((item) => item.id === table?.orderId) ?? null;
  const currency = venue.data?.currency ?? 'GHS';
  const columns = width >= 840 ? 4 : 2;

  const filteredTables = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'active') return item.status !== 'free';
    return item.status === filter;
  });

  const filterChips = [
    { id: 'all' as const, label: `All (${items.length})` },
    {
      id: 'needs_waiter' as const,
      label: `Calls (${items.filter((i) => i.status === 'needs_waiter').length})`,
    },
    {
      id: 'waiting_to_pay' as const,
      label: `Paying (${items.filter((i) => i.status === 'waiting_to_pay').length})`,
    },
    {
      id: 'active' as const,
      label: `Active (${items.filter((i) => i.status !== 'free').length})`,
    },
    {
      id: 'free' as const,
      label: `Free (${items.filter((i) => i.status === 'free').length})`,
    },
  ];

  return (
    <OwnerPage
      title={t('owner.floor')}
      subtitle="Floor layout, live table status, order tickets, and waiter calls."
    >
      <DeskWait loading={floor.isLoading} error={floor.isError} onRetry={() => void floor.refetch()}>
        <View style={styles.stack}>
          {/* Status Filter Chips */}
          <ChipRow items={filterChips} value={filter} onChange={setFilter} />

          {/* Tables Grid */}
          {items.length === 0 ? (
            <Text variant="body" style={{ color: theme.muted }}>
              {t('owner.emptyFloor')}
            </Text>
          ) : null}

          <View style={styles.grid}>
            {filteredTables.map((item) => {
              const isPicked = picked === item.id;
              const isCalling = item.status === 'needs_waiter';
              const isPaying = item.status === 'waiting_to_pay';
              const isOrdered = item.status === 'ordered';

              const tone = isCalling
                ? 'alert'
                : isPicked
                  ? 'selected'
                  : isPaying || isOrdered
                    ? 'wash'
                    : 'plain';

              return (
                <DeskCard
                  key={item.id}
                  tone={tone}
                  onPress={() => setPicked(item.id)}
                  label={`Table ${item.label ?? item.code}, ${t(LABEL[item.status])}`}
                  style={{
                    ...styles.tile,
                    width: `${100 / columns - 2.5}%` as DimensionValue,
                  }}
                >
                  <View style={styles.tileHeader}>
                    <Text variant="display-m" style={styles.tableCode}>
                      {item.code}
                    </Text>
                    {isCalling ? (
                      <View style={[styles.alertDot, { backgroundColor: theme.fill }]} />
                    ) : null}
                  </View>

                  <View style={styles.tileFooter}>
                    <StatusPill
                      label={t(LABEL[item.status])}
                      tone={
                        isCalling
                          ? 'error'
                          : isPaying
                            ? 'waiting'
                            : isOrdered
                              ? 'accent'
                              : 'neutral'
                      }
                      icon={isCalling || isPaying}
                    />

                    {item.billPesewas ? (
                      <Text
                        variant="caption"
                        style={[styles.tileBill, { fontVariant: ['tabular-nums'] }]}
                      >
                        {formatMoney(pesewas(item.billPesewas), currency)}
                      </Text>
                    ) : null}
                  </View>
                </DeskCard>
              );
            })}
          </View>

          {/* Selected Table Detail Bill Sheet */}
          {table ? (
            <DeskCard style={styles.tableDetailCard}>
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="title">
                    {table.label ? `Table ${table.label}` : `Table ${table.code}`}
                  </Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Status: {t(LABEL[table.status])}
                  </Text>
                </View>

                {table.billPesewas != null ? (
                  <Text
                    variant="title"
                    style={[styles.totalPrice, { fontVariant: ['tabular-nums'] }]}
                  >
                    {formatMoney(
                      pesewas(Math.max(0, bill ? bill.totalPesewas - bill.paidPesewas : 0)),
                      currency
                    )}
                  </Text>
                ) : null}
              </View>

              {/* Waiter call notice if table needs waiter */}
              {table.waiterReason ? (
                <View style={[styles.callNotice, { backgroundColor: theme.tint }]}>
                  <Bell size={18} color={theme.ink} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body-strong" style={{ color: theme.ink }}>
                      Guest requested {t(`waiter.reasons.${table.waiterReason}`)}
                    </Text>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      Usually attended within 3 minutes
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Order Lines Checklist */}
              {bill?.lines && bill.lines.length > 0 ? (
                <View style={styles.billLines}>
                  {bill.lines.map((line) => (
                    <View key={line.id} style={styles.orderLineRow}>
                      <View style={styles.qtyBadge}>
                        <Text variant="caption" style={styles.qtyText}>
                          {line.quantity}×
                        </Text>
                      </View>
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

              {/* Action Buttons */}
              <View style={styles.detailActions}>
                {table.waiterCallId ? (
                  <View style={styles.buttonRow}>
                    <Button
                      label={t('owner.onTheWay')}
                      tone="primary"
                      onPress={() =>
                        call.mutate({ id: table.waiterCallId!, status: 'acknowledged' })
                      }
                      loading={call.isPending}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label={t('owner.doneCall')}
                      tone="secondary"
                      onPress={() =>
                        call.mutate({ id: table.waiterCallId!, status: 'resolved' })
                      }
                      loading={call.isPending}
                    />
                  </View>
                ) : null}

                {bill && table.orderId && table.status === 'waiting_to_pay' ? (
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
                          : MOVE_LABEL.serve
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
          ) : null}
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[3],
  },
  tile: {
    minHeight: 104,
    padding: tokens.space[3],
    justifyContent: 'space-between',
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tableCode: {
    fontSize: 26,
    lineHeight: 32,
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tileFooter: {
    gap: 4,
  },
  tileBill: {
    fontFamily: 'Inter_600',
    marginTop: 2,
  },
  tableDetailCard: {
    padding: tokens.space[4],
    gap: tokens.space[3],
    marginTop: tokens.space[2],
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: tokens.space[2],
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
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
  qtyBadge: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qtyText: {
    fontFamily: 'Inter_600',
    fontSize: 12,
  },
  detailActions: {
    gap: tokens.space[2],
    paddingTop: tokens.space[2],
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
});
