import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, UtensilsCrossed } from 'lucide-react-native';
import type { MenuItem } from '@/lib/api/types';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { tokens } from '@/theme/tokens';
import { guestFont, useTheme } from '@/ui/theme';
import { DishPrice } from './DishPrice';

/**
 * One dish in the menu grid: photo, name, price and an add button. The description lives on
 * the dish page, so the grid stays compact.
 * The button adds straight away when nothing has to be chosen; otherwise it opens the dish.
 */
export function DishCard({
  item,
  currency,
  onOpen,
  onAdd,
}: {
  item: MenuItem;
  currency?: string;
  onOpen: () => void;
  /** Null when the dish needs a choice first or is sold out. */
  onAdd: (() => void) | null;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const off = !item.available;
  return (
    <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={off ? `${item.name.en}, ${t('menu.soldOut')}` : item.name.en}
        onPress={onOpen}
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
      >
        <View style={[styles.photo, { backgroundColor: theme.wash }]}>
          {item.photo ? (
            <VenueImage
              url={item.photo.url}
              alt={item.photo.alt ?? item.name.en}
              blurhash={item.photo.blurhash}
              style={[StyleSheet.absoluteFill, off && styles.dim]}
            />
          ) : (
            <UtensilsCrossed size={28} color={theme.meta} />
          )}
          {item.badges.includes('popular') && !off ? (
            <Text
              variant="caption"
              style={[styles.tag, { color: theme.badgeInk, backgroundColor: theme.tint }]}
            >
              {t('menu.popular')}
            </Text>
          ) : null}
          {off ? (
            <Text
              variant="caption"
              style={[styles.tag, { color: theme.error, backgroundColor: theme.white }]}
            >
              {t('menu.soldOut')}
            </Text>
          ) : null}
        </View>
        {/* Kept as small as it can be: one line of name, one of price, room for the + button. */}
        <View style={styles.body}>
          <Text variant="caption" numberOfLines={1} style={styles.name}>
            {item.name.en}
          </Text>
          <DishPrice item={item} currency={currency} />
        </View>
      </Pressable>
      {onAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('menu.addA11y', { name: item.name.en })}
          hitSlop={6}
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

// The + button and the space the text keeps clear for it.
const ADD = 32;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  open: { flex: 1 },
  pressed: { opacity: 0.85 },
  photo: { aspectRatio: 1.15, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.45 },
  tag: {
    position: 'absolute',
    top: tokens.space[2],
    left: tokens.space[2],
    overflow: 'hidden',
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space[2],
    paddingVertical: 2,
    fontFamily: guestFont.strong,
  },
  body: {
    paddingVertical: tokens.space[2],
    paddingStart: tokens.space[3],
    paddingEnd: tokens.space[3] + ADD,
  },
  name: { fontFamily: guestFont.strong },
  // Sits over the card's bottom-right corner, level with the price.
  add: {
    position: 'absolute',
    right: tokens.space[2],
    bottom: tokens.space[2],
    width: ADD,
    height: ADD,
    borderRadius: ADD / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
