import { Pressable, StyleSheet, View } from 'react-native';
import { statusKey } from '@/lib/orderTimeline';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import { api } from '@/lib/api';
import { POLL_MS } from '@/lib/polling';
import { guestKeys } from '@/lib/queryKeys';
import { useGuestSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

/** "Order #24 · Being prepared  Track ›" on the venue's page while an order is on its way. */
export function ActiveOrderStrip({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const orderId = useGuestSession((s) => (s.slug === slug ? s.orderId : null));
  const order = useQuery({
    queryKey: guestKeys.order(orderId),
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
    refetchInterval: POLL_MS.guest,
  });
  const o = order.data;
  if (!o || o.status === 'served' || o.status === 'cancelled') return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/${slug}/status`)}
      style={[styles.strip, { backgroundColor: theme.tint }]}
    >
      <View style={[styles.dot, { backgroundColor: theme.ink }]} />
      <Text
        variant="body"
        numberOfLines={1}
        style={[styles.flex, styles.strong, { color: theme.ink }]}
      >
        {t('myOrders.track', { number: o.number, status: t(statusKey(o)) })}
      </Text>
      <Text variant="caption" style={[styles.strong, { color: theme.ink }]}>
        {t('myOrders.trackAction')}
      </Text>
      <ChevronRight size={16} color={theme.ink} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: 44,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  flex: { flex: 1 },
  strong: { fontFamily: fontFamily.strong },
});
