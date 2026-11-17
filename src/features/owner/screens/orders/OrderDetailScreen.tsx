import { useState } from 'react';
import { finishWord } from '@/lib/orderTimeline';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { timeAgo } from '@/lib/time';
import { useTheme } from '@/ui/theme';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { cardStyle, ConfirmDialog, EmptyCard, TitledSection, toast } from '../../kit';
import { SectionHead } from '../dashboard/SectionHead';
import { MarkPaidSheet } from './MarkPaidSheet';
import { OrderBill } from './OrderBill';
import { OrderContact } from './OrderContact';
import { orderPlace } from './orderPlace';
import { orderSteps } from './orderSteps';
import { StepRows } from './StepRows';
import { OrderHead } from './OrderHead';
import { OrderPayment } from './OrderPayment';
import { useOrderMove } from './useOrderMove';
import { useVenuePay } from './useVenuePay';
import { POLL_MS } from '@/lib/polling';

/**
 * One order on its own page (canvas): its kitchen and payment state with the next step, the
 * dishes, the sums the server worked out, payment, the timeline, and Cancel for owners and
 * managers. The order comes from the same live list as Orders, so it costs no extra call.
 */
export function OrderDetailScreen({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Read the clock once so the page stays pure; "2 min ago" refreshes with the order poll.
  const [now] = useState(() => Date.now());
  const theme = useTheme();
  const client = useQueryClient();
  const { venue, methods } = useVenuePay(venueId);
  const orders = useQuery({
    queryKey: ownerKeys.orders(venueId),
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
    refetchInterval: POLL_MS.owner,
  });
  const move = useOrderMove(venueId, role);
  const order = orders.data?.items.find((item) => item.id === orderId) ?? null;
  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const canMarkPaid =
    (role === 'owner' || role === 'manager' || role === 'waiter') &&
    order != null &&
    order.paymentStatus !== 'paid' &&
    order.status !== 'cancelled';
  const back = () => (router.canGoBack() ? router.back() : router.replace('/owner/orders'));

  const cancel = useMutation({
    mutationFn: (id: string) => api.ownerSetOrderStatus(id, { status: 'cancelled' }),
    onSuccess: () => {
      setCancelling(false);
      void client.invalidateQueries({ queryKey: ownerKeys.orders(venueId) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const place = order ? orderPlace(order, t) : null;
  const next = order ? move.label(order) : null;
  const live = order != null && order.status !== 'served' && order.status !== 'cancelled';
  const mayCancel = live && (role === 'owner' || role === 'manager');
  const items = order ? order.lines.reduce((sum, line) => sum + line.quantity, 0) : 0;
  const source = order?.source && order.source !== 'table' ? order.source : 'table';

  return (
    <OwnerPage
      title={
        order && place
          ? t('ownerOrders.detail.heading', { where: place.where, number: order.number })
          : t('owner.orders')
      }
      subtitle={
        order
          ? t('ownerOrders.detail.orderedAgo', { ago: timeAgo(order.createdAt, now, t) })
          : undefined
      }
      back={{ label: t('owner.orders'), onPress: back }}
    >
      <DeskWait
        loading={orders.isLoading}
        error={orders.isError}
        onRetry={() => void orders.refetch()}
      >
        {order ? (
          <View style={styles.stack}>
            <OrderHead
              order={order}
              next={next}
              busy={move.busy(order)}
              onNext={() => move.run(order)}
              currency={currency}
            />
            <View style={styles.group}>
              <SectionHead
                title={t('ownerOrders.detail.items')}
                badge={String(items)}
                badgeTone="neutral"
              />
              <View style={[cardStyle(theme), styles.card]}>
                <OrderBill order={order} currency={currency} part="lines" />
              </View>
            </View>
            <TitledSection title={t('ownerOrders.detail.total')} cardStyle={styles.cardPad}>
              <OrderBill order={order} currency={currency} part="sums" />
            </TitledSection>
            <OrderPayment
              order={order}
              currency={currency}
              canMarkPaid={canMarkPaid}
              onMarkPaid={() => setPaying(true)}
            />
            {order.contact ? (
              <TitledSection title={t('ownerOrders.detail.about')} cardStyle={styles.cardPad}>
                <OrderContact order={order} />
              </TitledSection>
            ) : null}
            <TitledSection title={t('ownerOrders.detail.timeline')} cardStyle={styles.card}>
              <StepRows
                steps={orderSteps(order)}
                firstNote={t(`ownerOrders.detail.from.${source}`)}
                finish={finishWord(order.source)}
              />
            </TitledSection>
            {mayCancel ? (
              <Button
                label={t('ownerOrders.detail.cancel')}
                tone="secondary"
                labelColor={theme.error}
                onPress={() => setCancelling(true)}
                style={[styles.short, styles.start]}
              />
            ) : null}
          </View>
        ) : (
          <EmptyCard
            icon={SearchX}
            title={t('ownerOrders.detail.missing')}
            description={t('ownerOrders.detail.missingBody')}
            actionLabel={t('ownerOrders.detail.backToOrders')}
            onAction={back}
          />
        )}
      </DeskWait>
      {paying && order ? (
        <MarkPaidSheet
          order={order}
          venueId={venueId}
          methods={methods}
          currency={currency}
          onClose={() => setPaying(false)}
        />
      ) : null}
      <ConfirmDialog
        visible={cancelling}
        title={t('ownerOrders.detail.cancelTitle')}
        message={t('ownerOrders.detail.cancelBody')}
        confirmLabel={t('ownerOrders.detail.cancel')}
        onConfirm={() => order && cancel.mutate(order.id)}
        onCancel={() => setCancelling(false)}
      />
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.sectionGap },
  group: { gap: tokens.space[4] },
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  pills: { flexDirection: 'row', gap: tokens.space[2] },
  card: { paddingVertical: 2, paddingHorizontal: tokens.owner.controls.cardPadding },
  cardPad: { padding: tokens.owner.controls.cardPadding },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], minHeight: 60 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  short: { minHeight: 40 },
  start: { alignSelf: 'flex-start' },
});
