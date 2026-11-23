import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRetryKey } from '@/lib/retryKey';
import { useTranslation } from 'react-i18next';
import { OfflineNote } from '@/ui/OfflineNote';
import { Plus, ShoppingBag } from 'lucide-react-native';
import { api } from '@/lib/api';
import { cartCount, cartEstimate, linesFor, useCart } from '@/features/cart';
import { useGuestSession } from '@/features/session';
import { useVenue } from '@/features/venue';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { guestFont, useTheme } from '@/ui/theme';
import { pesewas } from '@/lib/brand';
import { toMessageKey } from '@/lib/api/errors';
import { onlineOrderingOf } from '@/lib/onlineOrdering';
import { LinkCheckoutCard } from './LinkCheckoutCard';
import { checkCheckout, type CheckoutDraft } from './linkCheckout';
import { OrderLine } from './OrderLine';
import { pastOrderFrom, useOrderHistory } from '@/features/history';
import { canPayOnline } from '@/lib/payments';

const EMPTY_ICON = 64;

/**
 * The guest's order before it goes to the kitchen: each dish with − / +, the total, and one
 * Send button pinned at the bottom. The kitchen's own total replaces this estimate once sent.
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
  const table = useGuestSession((state) => (state.slug === slug ? state.tableCode : null));
  const setOrderId = useGuestSession((state) => state.setOrderId);
  const saveGuest = useGuestSession((state) => state.saveGuest);
  const remember = useOrderHistory((state) => state.remember);
  const hasSession = useGuestSession((state) => state.slug === slug && Boolean(state.token));
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
  const [errorKey, setErrorKey] = useState('errors.generic');
  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const [sending, setSending] = useState(false);
  const keyFor = useRetryKey();
  const [error, setError] = useState(false);
  const count = cartCount(lines);
  const food = cartEstimate(lines);
  // Only offer what the venue offers; pickup first when both are on.
  const type =
    ordering.pickup.enabled && ordering.delivery.enabled
      ? draft.type
      : ordering.delivery.enabled
        ? 'delivery'
        : 'pickup';
  const check = checkCheckout({ ...draft, type }, ordering, venuePin, food);
  // Venues with payments in the app take the guest to the Payment page after sending.
  const payNext = canPayOnline(venue.data);
  const fee = online && check.ok ? check.deliveryFeePesewas : 0;
  const total = formatMoney(pesewas(food + fee), currency);
  const canOrderHere = !online || ordering.enabled;
  const place = venue.data?.name ?? '';

  const send = async () => {
    if (online && !check.ok) {
      setTried(true);
      return;
    }
    setSending(true);
    setError(false);
    const body = {
      lines: lines.map((line) => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        modifierOptionIds: line.modifierOptionIds,
        note: line.note,
      })),
      ...(online && check.ok ? { fulfilment: check.fulfilment } : {}),
    };
    // A retry of the same basket reuses the id, so a lost reply never makes a second order.
    const clientOrderId = keyFor(body);
    // A menu-link visit has no table scan to start a session, so start one now (no personal data).
    if (online && !hasSession) {
      try {
        const session = await api.createGuestSession({ venueSlug: slug });
        saveGuest({ token: session.guestToken, slug, tableCode: null });
      } catch (failure) {
        setErrorKey(toMessageKey(failure));
        setSending(false);
        setError(true);
        return;
      }
    }
    api
      .createOrder({ clientOrderId, ...body }, { idempotencyKey: clientOrderId })
      .then((order) => {
        // Online customers find it again under My orders (no account, no personal data kept).
        if (online) remember(pastOrderFrom(order, slug, place, currency));
        setOrderId(order.id);
        clear();
        router.replace(payNext ? `/${slug}/pay` : `/${slug}/status`);
      })
      .catch((failure) => {
        setErrorKey(toMessageKey(failure));
        setSending(false);
        setError(true);
      });
  };

  return (
    <SafeScreen includeBottom={false}>
      <PageHeader
        title={t('basket.title')}
        subtitle={table ? `${t('home.table', { code: table })} · ${place}` : place}
      />
      <OfflineNote sending />
      {lines.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.tint }]}>
            <ShoppingBag size={28} color={theme.ink} strokeWidth={2} />
          </View>
          <Text variant="title" style={styles.center}>
            {t('basket.emptyTitle')}
          </Text>
          <Text variant="body" style={[styles.center, { color: theme.muted }]}>
            {t('basket.emptyBody')}
          </Text>
          <Button
            label={t('basket.browse')}
            onPress={() => router.replace(`/${slug}/menu`)}
            style={styles.stretch}
          />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.page}>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              {lines.map((line, index) => (
                <Fragment key={line.key}>
                  {index > 0 ? (
                    <View style={[styles.line, { backgroundColor: theme.line }]} />
                  ) : null}
                  <OrderLine
                    line={line}
                    currency={currency}
                    onQuantity={(quantity) => setQuantity(line.key, quantity)}
                  />
                </Fragment>
              ))}
              <View style={[styles.line, { backgroundColor: theme.line }]} />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.addMore,
                  pressed && { backgroundColor: theme.wash },
                ]}
              >
                <Plus size={18} color={theme.ink} strokeWidth={2} />
                <Text variant="body-strong" style={{ color: theme.ink }}>
                  {t('basket.addMore')}
                </Text>
              </Pressable>
            </View>

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

            <View style={[styles.card, styles.summary, { backgroundColor: theme.surface }]}>
              <View style={styles.summaryRow}>
                <Text variant="body" style={{ color: theme.muted }}>
                  {t('basket.items')}
                </Text>
                <Text variant="body" style={[styles.num, { color: theme.muted }]}>
                  {count}
                </Text>
              </View>
              {fee > 0 ? (
                <View style={styles.summaryRow}>
                  <Text variant="body" style={{ color: theme.muted }}>
                    {t('linkOrder.deliveryFee')}
                  </Text>
                  <Text variant="body" style={[styles.num, { color: theme.muted }]}>
                    {formatMoney(pesewas(fee), currency)}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.rule, { backgroundColor: theme.line }]} />
              <View style={styles.summaryRow}>
                <Text variant="title">{t('status.total')}</Text>
                <Text variant="title" style={styles.num}>
                  {total}
                </Text>
              </View>
              <Text variant="caption" style={{ color: theme.meta }}>
                {t('basket.estimate')}
              </Text>
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom, tokens.space[3]),
                backgroundColor: theme.white,
                borderTopColor: theme.line,
              },
            ]}
          >
            {error ? (
              <Text variant="caption" accessibilityRole="alert" style={{ color: theme.error }}>
                {t(errorKey)}
              </Text>
            ) : null}
            {canOrderHere ? (
              <Button
                label={
                  payNext
                    ? t('payment.continue', { amount: total })
                    : online
                      ? t('linkOrder.place')
                      : t('menu.send')
                }
                loading={sending}
                onPress={() => void send()}
              />
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
    gap: tokens.space[4],
    paddingBottom: tokens.space[8],
  },
  card: {
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
    overflow: 'hidden',
  },
  line: { height: StyleSheet.hairlineWidth, marginStart: tokens.space[4] },
  addMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    padding: tokens.space[4],
    minHeight: 44,
  },
  summary: { padding: tokens.space[4], gap: tokens.space[2] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: tokens.space[1] },
  num: { fontVariant: ['tabular-nums'], fontFamily: guestFont.strong },
  footer: {
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: tokens.space[3],
    gap: tokens.space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space[8],
    gap: tokens.space[3],
  },
  emptyIcon: {
    width: EMPTY_ICON,
    height: EMPTY_ICON,
    borderRadius: EMPTY_ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch', marginTop: tokens.space[2] },
});
