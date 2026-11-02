import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, UtensilsCrossed } from 'lucide-react-native';
import type { MenuItem } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { PriceText } from '@/ui/PriceText';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { fontFamily, useTheme } from '@/ui/theme';

/**
 * One dish in the list view (the default): a square photo, name, one line of description,
 * price, and the add button. Sold out dims the row and says so in words.
 */
export function DishRow({
  item,
  currency,
  onOpen,
  onAdd,
}: {
  item: MenuItem;
  currency: string;
  onOpen: () => void;
  onAdd: (() => void) | null;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const off = !item.available;
  const popular = item.badges.includes('popular') && !off;
  return (
    <View style={[styles.row, { backgroundColor: theme.surface }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={off ? `${item.name.en}, ${t('menu.soldOut')}` : item.name.en}
        onPress={onOpen}
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
      >
        <View style={[styles.photo, { backgroundColor: theme.wash }, off && styles.dim]}>
          {item.photo ? (
            <VenueImage
              url={item.photo.url}
              alt={item.photo.alt ?? item.name.en}
              blurhash={item.photo.blurhash}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <UtensilsCrossed size={22} color={theme.meta} />
          )}
        </View>
        <View style={styles.copy}>
          <Text variant="body-strong" numberOfLines={1}>
            {item.name.en}
          </Text>
          {item.description.en ? (
            <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
              {item.description.en}
            </Text>
          ) : null}
          <View style={styles.meta}>
            <PriceText amount={item.pricePesewas} currency={currency} />
            {popular ? (
              <Text variant="caption" style={[styles.tag, { color: theme.badgeInk }]}>
                {t('menu.popular')}
              </Text>
            ) : null}
            {off ? (
              <Text variant="caption" style={[styles.tag, { color: theme.error }]}>
                {t('menu.soldOut')}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      {onAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('menu.addA11y', { name: item.name.en })}
          hitSlop={tokens.space[1] + 2}
          onPress={onAdd}
          style={({ pressed }) => [
            styles.add,
            { backgroundColor: pressed ? theme.pressed : theme.fill },
          ]}
        >
          <Plus size={16} color={theme.onFill} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

const PHOTO = 72;
const ADD = 32;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    padding: tokens.space[2],
    paddingEnd: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  pressed: { opacity: 0.85 },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.45 },
  copy: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2], marginTop: 2 },
  tag: { fontFamily: fontFamily.strong },
  add: {
    width: ADD,
    height: ADD,
    borderRadius: ADD / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
