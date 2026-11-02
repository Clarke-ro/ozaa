import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useGuestSession } from '@/features/session';
import { showsFoodReady } from './orderMachine';

/** Polls the order. Kitchen `ready` is the only state that shows this, including over the game. */
export function FoodReadyBanner({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const orderId = useGuestSession((state) => (state.slug === slug ? state.orderId : null));
  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
    refetchInterval: 10_000,
  });
  if (!order.data || !showsFoodReady(order.data.status)) return null;
  const dish = order.data.lines[0]?.name ?? '';
  return (
    <View style={[styles.banner, { top: insets.top + tokens.space[2] }]}>
      <Text variant="body" style={styles.copy}>
        {t('status.banner', { dish, table: order.data.tableCode ?? '' })}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('status.view')} onPress={() => router.push(`/${slug}/status`)} style={styles.view}>
        <Text variant="button" style={styles.copy}>
          {t('status.view')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: tokens.space[4],
    right: tokens.space[4],
    backgroundColor: '#111111',
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    zIndex: 20,
  },
  copy: { color: '#FFFFFF', flex: 1 },
  view: { minHeight: 44, justifyContent: 'center' },
});
