import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { EmptyCard, InfoRow, Section, SectionBody, StatusPill } from '../../kit';
import { MarkPaidSheet } from './MarkPaidSheet';
import { OrderBill } from './OrderBill';
import { OrderContact } from './OrderContact';
import { orderPlace, PAID_TONE, paidLabel } from './orderPlace';
import { orderSteps } from './orderSteps';
import { OrderTimeline } from './OrderTimeline';
import { useOrderMove } from './useOrderMove';
import { useVenuePay } from './useVenuePay';
import { POLL_MS } from '@/lib/polling';

// The side column on a desktop: wide enough for the timeline and the pay button, no wider.
const SIDE_COLUMN = 340;

/**
 * One order on its own page: the dishes with prices and the sums on the left; where it is in the
 * kitchen, how it is paid and who it is for on the right (stacked on smaller screens). The next
 * kitchen step is the page's one filled button. The order comes from the same live list as
 * Orders, so it stays current and costs no extra call.
 */
export function OrderDetailScreen({ orderId }: { orderId: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { desktop } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const [paying, setPaying] = useState(false);
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

  const place = order ? orderPlace(order, t) : null;
  const placed = order
    ? new Date(order.createdAt).toLocaleString(i18n.language, {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const next = order ? move.label(order) : null;

  const side = order ? (
    <View style={[styles.column, desktop && { width: SIDE_COLUMN }]}>
      <Section title={t('ownerOrders.detail.progress')}>
        <SectionBody>
          <OrderTimeline steps={orderSteps(order)} />
        </SectionBody>
      </Section>
      <Section title={t('ownerOrders.detail.payment')}>
        <SectionBody>
          <View style={styles.pay}>
            <StatusPill
              label={paidLabel(order, t)}
              tone={PAID_TONE[order.paymentStatus]}
              icon={false}
            />
            {canMarkPaid ? (
              <Button
                label={t('ownerOrders.markPaid.open')}
                size="md"
                tone="secondary"
                onPress={() => setPaying(true)}
              />
            ) : null}
          </View>
        </SectionBody>
      </Section>
      <Section title={t('ownerOrders.detail.about')}>
        <InfoRow label={t('ownerOrders.detail.where')} value={place?.where} />
        <InfoRow label={t('ownerOrders.detail.placed')} value={placed} />
        {order.etaMinutes != null && order.status !== 'served' && order.status !== 'cancelled' ? (
          <InfoRow
            label={t('ownerOrders.detail.eta')}
            value={t('ownerCalls.minutes', { count: order.etaMinutes })}
          />
        ) : null}
        {order.contact ? (
          <SectionBody>
            <OrderContact order={order} />
          </SectionBody>
        ) : null}
      </Section>
    </View>
  ) : null;

  return (
    <OwnerPage
      title={order ? t('ownerOrders.detail.title', { number: order.number }) : t('owner.orders')}
      subtitle={order && place ? place.where : undefined}
      width="wide"
      back={{ label: t('owner.orders'), onPress: back }}
      action={
        order && next ? (
          <Button
            label={next}
            size="md"
            loading={move.busy(order)}
            onPress={() => move.run(order)}
          />
        ) : undefined
      }
    >
      <DeskWait
        loading={orders.isLoading}
        error={orders.isError}
        onRetry={() => void orders.refetch()}
      >
        {order ? (
          <View style={[styles.layout, desktop && styles.row]}>
            <View style={[styles.column, styles.main]}>
              <Section title={t('ownerOrders.detail.dishes')}>
                <SectionBody>
                  <OrderBill order={order} currency={currency} />
                </SectionBody>
              </Section>
            </View>
            {side}
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
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  layout: { gap: tokens.space[4] },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },
  column: { gap: tokens.space[4] },
  pay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[2],
  },
});
