import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, UtensilsCrossed } from 'lucide-react-native';
import type { MenuItem } from '@/lib/api/types';
import { PriceText } from '@/ui/PriceText';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { useTheme } from '@/ui/theme';

/**
 * One dish in the menu grid: photo, name, a two-line description, price and an add button.
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
        <View style={styles.body}>
          <Text variant="body-strong" numberOfLines={1}>
            {item.name.en}
          </Text>
          <Text variant="caption" numberOfLines={2} style={[styles.desc, { color: theme.muted }]}>
            {item.description.en}
          </Text>
          <View style={styles.foot}>
            <PriceText amount={item.pricePesewas} currency={currency} />
          </View>
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
          <Plus size={18} color={theme.onFill} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  open: { flex: 1 },
  pressed: { opacity: 0.85 },
  photo: { aspectRatio: 1.15, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.45 },
  tag: {
    position: 'absolute',
    top: 8,
    left: 8,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontFamily: 'Inter_600',
  },
  body: { padding: 12, gap: 4, flex: 1 },
  desc: { minHeight: 36 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    marginTop: 'auto',
    paddingTop: 4,
    paddingRight: 44,
  },
  // Sits over the card's bottom-right corner, level with the price.
  add: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
