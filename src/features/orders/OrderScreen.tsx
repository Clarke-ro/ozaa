import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react-native';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { onlineOrderingOf } from '@/lib/onlineOrdering';
import { canPayOnline } from '@/lib/payments';
import { guestKeys } from '@/lib/queryKeys';
import { cartEstimate, linesFor, useCart } from '@/features/cart';
import { OrderPayment, payMethodsFor, previewPay, type PayInput } from '@/features/pay';
import { useGuestSession } from '@/features/session';
import { useVenue } from '@/features/venue';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { OfflineNote } from '@/ui/OfflineNote';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { EmptyOrder } from './EmptyOrder';
import { LinkCheckoutCard } from './LinkCheckoutCard';
import { checkCheckout, type CheckoutDraft } from './linkCheckout';
import { OrderItemCard } from './OrderItemCard';
import { usePlaceOrder } from './usePlaceOrder';

/**
 * The guest's order and its payment on one page (design canvas, Clarke 2026-11-23): the dishes
 * as grey cards, Add more dishes, the pickup or delivery details for a menu-link order, then how
 * to pay, and one Place order button pinned at the bottom.
 */
export function OrderScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lines = useCart((state) => linesFor(state, slug));
  const setQuantity = useCart((state) => state.setQuantity);
  const clear = useCart((state) => state.clear);
  const venue = useVenue(slug);
  const menu = useQuery({ queryKey: guestKeys.menu(slug), queryFn: () => api.getMenu(slug) });
  const table = useGuestSession((state) => (state.slug === slug ? state.tableCode : null));
  // No table means the guest came from the menu link: pickup or delivery, with contact details.
  const online = table === null;
  const ordering = onlineOrderingOf(venue.data?.onlineOrdering);
  const venuePin =
    venue.data?.location.lat != null && venue.data.location.lng != null
      ? { lat: venue.data.location.lat, lng: venue.data.location.lng }
      : null;
  const [draft, setDraft] = useState<CheckoutDraft>({
    type: 'pickup',
    name: '',
    phone: '',
    address: '',
    location: null,
  });
  const [tried, setTried] = useState(false);
  // Whole bill, no tip and MoMo to start (Clarke, 2026-11-23).
  const [pay, setPay] = useState<PayInput>({
    pick: 'momo',
    mode: 'whole',
    parts: 2,
    tip: 0,
    mine: [],
  });
  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const place = venue.data?.name ?? '';
  const food = cartEstimate(lines);
  // Only offer what the venue offers; pickup first when both are on.
  const type =
    ordering.pickup.enabled && ordering.delivery.enabled
      ? draft.type
      : ordering.delivery.enabled
        ? 'delivery'
        : 'pickup';
  const check = checkCheckout({ ...draft, type }, ordering, venuePin, food);
  const fee = online && check.ok ? check.deliveryFeePesewas : 0;
  const canOrderHere = !online || ordering.enabled;
  // Venues with payments in the app take payment here; the others send the order straight in.
  const payNext = canPayOnline(venue.data);
  const delivery = online && type === 'delivery';
  const methods = payMethodsFor({
    table: !online,
    delivery,
    cash: venue.data?.payMethods?.cash ?? false,
  });
  const input = methods.includes(pay.pick) ? pay : { ...pay, pick: methods[0] ?? 'momo' };
  const cash = input.pick === 'cash';
  const dishes = lines.map((line) => ({
    key: line.key,
    name: line.name,
    totalPesewas: pesewas((line.unitPricePesewas + line.modifierPesewas) * line.quantity),
  }));
  const summary = previewPay(
    dishes.map((dish) => ({ id: dish.key, totalPesewas: dish.totalPesewas })),
    food + fee,
    input,
    venue.data?.payMethods,
  );
  const { placeOrder, sending, errorKey } = usePlaceOrder({
    slug,
    online,
    table: !online,
    place,
    currency,
    payNext,
  });
  const photos = new Map((menu.data?.items ?? []).map((item) => [item.id, item.photo]));

  const send = () => {
    if (online && !check.ok) {
      setTried(true);
      return;
    }
    void placeOrder(lines, online && check.ok ? check.fulfilment : undefined, input);
  };

  return (
    <SafeScreen includeBottom={false} background={theme.white}>
      <PageHeader
        title={t('basket.title')}
        subtitle={table ? `${t('home.table', { code: table })} · ${place}` : place}
        right={
          lines.length > 0 ? (
            <IconButton plain label={t('basket.clear')} onPress={clear}>
              <Trash2 color={theme.black} size={22} strokeWidth={2} />
            </IconButton>
          ) : null
        }
      />
      <OfflineNote sending />
      {lines.length === 0 ? (
        <EmptyOrder onBrowse={() => router.replace(`/${slug}/menu`)} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <Text variant="title" accessibilityRole="header">
                {t('basket.summary')}
              </Text>
              {lines.map((line) => (
                <OrderItemCard
                  key={line.key}
                  line={line}
                  photo={photos.get(line.menuItemId)}
                  currency={currency}
                  onQuantity={(quantity) => setQuantity(line.key, quantity)}
                  onEdit={() => router.push(`/${slug}/menu/${line.menuItemId}`)}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.addMore,
                  { backgroundColor: pressed ? theme.pressed : theme.fill },
                ]}
              >
                <Plus size={16} color={theme.onFill} strokeWidth={2.5} />
                <Text variant="body-strong" style={{ color: theme.onFill }}>
                  {t('basket.addMore')}
                </Text>
              </Pressable>
            </View>
            <View style={[styles.rule, { backgroundColor: theme.tint }]} />

            {online && canOrderHere ? (
              <LinkCheckoutCard
                settings={ordering}
                draft={{ ...draft, type }}
                onDraft={setDraft}
                check={check}
                showErrors={tried}
                currency={currency}
              />
            ) : null}

            {payNext && canOrderHere ? (
              <OrderPayment
                input={input}
                onInput={setPay}
                methods={methods}
                dishes={dishes}
                table={!online}
                delivery={delivery}
                summary={summary}
                venueName={place}
                currency={currency}
                testMode={venue.data?.payMethods?.testMode ?? false}
              />
            ) : (
              <View style={[styles.total, { backgroundColor: theme.wash }]}>
                <Text variant="title">{t('status.total')}</Text>
                <Text variant="title" style={styles.num}>
                  {formatMoney(pesewas(food + fee), currency)}
                </Text>
              </View>
            )}
            <Text variant="caption" style={[styles.center, { color: theme.meta }]}>
              {t('basket.estimate')}
            </Text>
          </ScrollView>

          <View
            style={[styles.footer, { paddingBottom: Math.max(insets.bottom, tokens.space[3]) }]}
          >
            {errorKey ? (
              <Text variant="caption" accessibilityRole="alert" style={{ color: theme.error }}>
                {t(errorKey)}
              </Text>
            ) : null}
            {canOrderHere ? (
              <>
                <Button
                  label={payNext || online ? t('linkOrder.place') : t('menu.send')}
                  loading={sending}
                  // My items needs at least one dish ticked.
                  disabled={!cash && input.mode === 'items' && input.mine.length === 0}
                  onPress={send}
                />
                {payNext && !cash ? (
                  <Text variant="caption" style={[styles.center, { color: theme.muted }]}>
                    {t('payment.next')}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text variant="body" style={{ color: theme.muted }}>
                {t('linkOrder.tableOnly')}
              </Text>
            )}
          </View>
        </>
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: tokens.grid.mobile.margin,
    gap: tokens.space[5],
    paddingBottom: tokens.space[8],
  },
  section: { gap: tokens.space[3] },
  addMore: {
    alignSelf: 'center',
    minWidth: 224,
    minHeight: 44,
    marginTop: tokens.space[2],
    paddingHorizontal: tokens.space[5],
    borderRadius: tokens.radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
  },
  rule: { height: 1, marginHorizontal: -tokens.grid.mobile.margin },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.space[4],
    borderRadius: tokens.radius.md,
  },
  num: { fontVariant: ['tabular-nums'] },
  footer: {
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: tokens.space[3],
    gap: tokens.space[2],
  },
  center: { textAlign: 'center' },
});
