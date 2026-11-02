import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChefHat, CircleCheck, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cartCount, useCart } from '@/features/cart';
import { useGuestSession } from '@/features/session';
import { orderToast } from './orderMachine';

/**
 * The one order toast for a venue, mounted in the venue layout so it follows the guest across
 * screens (the game included). It says where the order is, opens the status page on tap, and can
 * be closed. Closing hides it until the order moves on, so "ready" always gets through.
 */
export function OrderToast({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const [closed, setClosed] = useState<string | null>(null);
  // On the menu the "View order" bar sits at the bottom, so the toast rides just above it.
  const hasCart = useCart((state) => cartCount(state.lines) > 0);
  const cartBar = hasCart && path.endsWith('/menu');
  const orderId = useGuestSession((state) => (state.slug === slug ? state.orderId : null));
  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
    refetchInterval: 10_000,
  });

  const data = order.data;
  const kind = data ? orderToast(data.status) : null;
  const key = data ? `${data.id}:${data.status}` : null;
  // The status page already shows all of this.
  if (!data || !kind || key === closed || path.endsWith('/status')) return null;

  const ready = kind === 'ready';
  const title = ready
    ? t('orderToast.ready', { number: data.number })
    : t('orderBar.title', { number: data.number, status: t(`statusLabel.${data.status}`) });
  // No estimate from the kitchen means no time shown, never a guessed one.
  const detail = ready
    ? t('orderToast.readyDetail', { table: data.tableCode ?? '' })
    : data.etaMinutes != null
      ? t('orderBar.meta', { minutes: data.etaMinutes, count: data.lines.length })
      : t('orderBar.items', { count: data.lines.length });

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.toast,
        {
          bottom:
            Math.max(insets.bottom, tokens.space[4]) +
            (cartBar ? tokens.button.height.lg + tokens.space[3] : 0),
          backgroundColor: theme.black,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${detail}`}
        accessibilityHint={t('orderToast.openHint')}
        onPress={() => router.push(`/${slug}/status`)}
        style={styles.body}
      >
        <View style={[styles.icon, { backgroundColor: ready ? theme.success : theme.fill }]}>
          {ready ? (
            <CircleCheck size={18} color={theme.white} />
          ) : (
            <ChefHat size={18} color={theme.onFill} />
          )}
        </View>
        <View style={styles.copy}>
          <Text variant="body-strong" numberOfLines={1} style={{ color: theme.white }}>
            {title}
          </Text>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.line }}>
            {detail}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('orderToast.close')}
        onPress={() => setClosed(key)}
        hitSlop={tokens.space[2]}
        style={styles.close}
      >
        <X size={18} color={theme.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: tokens.space[4],
    right: tokens.space[4],
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingStart: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
