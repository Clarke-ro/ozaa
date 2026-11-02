import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/lib/money';
import { cartCount, cartEstimate, useCart } from '@/features/cart';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * "3 View order · GH₵143" at the bottom of the menu. It reads the cart itself so adding a dish
 * re-renders only this bar, not every dish card on a cheap phone (BUILD.md section 11, Lists).
 */
export function MenuCartBar({ slug, currency }: { slug: string; currency: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const lines = useCart((state) => state.lines);
  const count = cartCount(lines);
  if (count === 0) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/${slug}/order`)}
      style={({ pressed }) => [
        styles.bar,
        { backgroundColor: pressed ? theme.pressed : theme.fill },
      ]}
    >
      <Text variant="button" style={{ color: theme.onFill }}>
        {count} {t('menu.viewOrder')}
      </Text>
      <Text variant="button" style={{ color: theme.onFill, fontVariant: ['tabular-nums'] }}>
        {formatMoney(cartEstimate(lines), currency)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
