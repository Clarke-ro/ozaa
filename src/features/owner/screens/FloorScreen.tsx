import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { api } from '@/lib/api';
import type { FloorTable } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { nextOrderMove, type OrderStatus, type StaffRole } from '@/features/orders';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';

const LABEL = {
  free: 'owner.free',
  seated: 'owner.seated',
  ordered: 'owner.ordered',
  waiting_to_pay: 'owner.waitingPay',
  needs_waiter: 'owner.needsWaiter',
} as const;

const MOVE_LABEL = { start: 'owner.start', ready: 'owner.markReady', serve: 'owner.markServed' } as const;

export function FloorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = (useOwnerSession((state) => state.role) ?? 'waiter') as StaffRole;
  const client = useQueryClient();
  const [picked, setPicked] = useState<string | null>(null);
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
    mutationFn: (input: { id: string; next: OrderStatus }) => api.ownerSetOrderStatus(input.id, { status: input.next }),
    onSuccess: refresh,
  });
  const cash = useMutation({
    mutationFn: (input: { id: string; amount: number }) =>
      api.ownerRecordCashPayment(input.id, { amountPesewas: input.amount }, { idempotencyKey: Crypto.randomUUID() }),
    onSuccess: refresh,
  });
  const call = useMutation({
    mutationFn: (input: { id: string; status: 'acknowledged' | 'resolved' }) => api.ownerUpdateWaiterCall(input.id, { status: input.status }),
    onSuccess: refresh,
  });

  const table = floor.data?.items.find((item) => item.id === picked) ?? null;
  const bill = orders.data?.items.find((item) => item.id === table?.orderId) ?? null;
  const currency = venue.data?.currency ?? 'GHS';
  const columns = width >= 840 ? 4 : 2;

  return (
    <OwnerPage title={t('owner.floor')}>
      <DeskWait loading={floor.isLoading} error={floor.isError} onRetry={() => void floor.refetch()}>
        {(floor.data?.items.length ?? 0) === 0 ? <Text>{t('owner.emptyFloor')}</Text> : null}
        <View style={styles.grid}>
          {(floor.data?.items ?? []).map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.label ?? item.code}. ${t(LABEL[item.status])}`}
              onPress={() => setPicked(item.id)}
              style={[
                styles.tile,
                { width: `${100 / columns - 2}%`, borderColor: picked === item.id ? theme.black : theme.line },
              ]}
            >
              <Text variant="title">{item.code}</Text>
              <Text variant="caption" style={{ color: item.status === 'needs_waiter' ? theme.fill : theme.meta }}>
                {t(LABEL[item.status])}
              </Text>
            </Pressable>
          ))}
        </View>
        {table ? (
          <TableBill
            table={table}
            currency={currency}
            billLines={bill?.lines.map((line) => `${line.quantity} ${line.name}`) ?? []}
            remaining={bill ? bill.totalPesewas - bill.paidPesewas : 0}
            busy={status.isPending || cash.isPending || call.isPending}
            moveLabel={table.orderStatus ? moveLabel(table.orderStatus as OrderStatus, role, t) : null}
            onMove={
              bill && table.orderId && table.orderStatus && nextOrderMove(table.orderStatus as OrderStatus, role)
                ? () => {
                    const next = nextOrderMove(table.orderStatus as OrderStatus, role);
                    if (!next || !table.orderId) return;
                    status.mutate({ id: table.orderId, next: next.status });
                  }
                : undefined
            }
            onCash={
              bill && table.orderId && table.status === 'waiting_to_pay'
                ? () => {
                    if (!table.orderId || !bill) return;
                    cash.mutate({ id: table.orderId, amount: Math.max(0, bill.totalPesewas - bill.paidPesewas) });
                  }
                : undefined
            }
            onAck={
              table.waiterCallId
                ? () => {
                    if (!table.waiterCallId) return;
                    call.mutate({ id: table.waiterCallId, status: 'acknowledged' });
                  }
                : undefined
            }
            onDone={
              table.waiterCallId
                ? () => {
                    if (!table.waiterCallId) return;
                    call.mutate({ id: table.waiterCallId, status: 'resolved' });
                  }
                : undefined
            }
          />
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

function moveLabel(status: OrderStatus, role: StaffRole, t: (key: string) => string): string | null {
  const next = nextOrderMove(status, role);
  if (!next) return null;
  return t(next.move === 'start' ? MOVE_LABEL.start : next.move === 'ready' ? MOVE_LABEL.ready : MOVE_LABEL.serve);
}

function TableBill({
  table,
  currency,
  billLines,
  remaining,
  moveLabel: label,
  onMove,
  onCash,
  onAck,
  onDone,
  busy,
}: {
  table: FloorTable;
  currency: string;
  billLines: string[];
  remaining: number;
  moveLabel: string | null;
  onMove?: () => void;
  onCash?: () => void;
  onAck?: () => void;
  onDone?: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const primary = onAck ? t('owner.onTheWay') : onCash ? t('owner.cash') : label;
  const press = onAck ?? onCash ?? onMove;
  return (
    <View style={[styles.bill, { borderColor: theme.line }]}>
      <Text variant="title">{table.label ?? table.code}</Text>
      {table.waiterReason ? <Text variant="body">{t(`waiter.reasons.${table.waiterReason}`)}</Text> : null}
      {billLines.length === 0 ? <Text variant="body">{t('owner.noBill')}</Text> : null}
      {billLines.map((line) => (
        <Text key={line} variant="body">
          {line}
        </Text>
      ))}
      {table.billPesewas != null ? (
        <Text variant="body-strong" style={{ fontVariant: ['tabular-nums'] }}>
          {formatMoney(pesewas(Math.max(0, remaining)), currency)}
        </Text>
      ) : null}
      {primary && press ? <Button label={primary} onPress={press} loading={busy} /> : null}
      {onDone ? <Button label={t('owner.doneCall')} onPress={onDone} tone="ghost" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  tile: { minHeight: 88, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space[3], justifyContent: 'space-between' },
  bill: { borderTopWidth: 1, paddingTop: tokens.space[4], gap: tokens.space[2] },
});
