import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
import type { MenuItem } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { guestFont, useTheme } from '@/ui/theme';
import { DishPrice } from './DishPrice';

export const TILE_W = 280;
export const TILE_H = 112;
const ADD = 36;

/**
 * One dish in a sideways row (Special offers, Most ordered): name, an optional label, price and
 * photo. Tapping opens the dish; the round button adds it, when it needs no choices first.
 */
export function DishTile({
  item,
  label,
  currency,
  onOpen,
  onAdd,
}: {
  item: MenuItem;
  label?: string | null;
  currency: string;
  onOpen: () => void;
  onAdd: (() => void) | null;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[tileStyle.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${item.name.en}, ${label}` : item.name.en}
        onPress={onOpen}
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
      >
        <View style={styles.copy}>
          <Text variant="body" numberOfLines={2} style={styles.strong}>
            {item.name.en}
          </Text>
          {label ? (
            <Text variant="caption" numberOfLines={1} style={[styles.strong, { color: theme.ink }]}>
              {label}
            </Text>
          ) : null}
          <DishPrice item={item} currency={currency} />
        </View>
        <View style={[styles.photo, { backgroundColor: theme.wash }]}>
          {item.photo ? (
            <VenueImage
              url={item.photo.url}
              alt={item.photo.alt ?? item.name.en}
              blurhash={item.photo.blurhash}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
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

/** The tile's outline, shared with the offer notes in the same row. */
export const tileStyle = StyleSheet.create({
  card: {
    width: TILE_W,
    height: TILE_H,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});

const styles = StyleSheet.create({
  open: { flex: 1, flexDirection: 'row' },
  pressed: { opacity: 0.85 },
  copy: {
    flex: 1,
    gap: 2,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    justifyContent: 'center',
  },
  strong: { fontFamily: guestFont.strong },
  photo: { width: TILE_H, height: TILE_H },
  add: {
    position: 'absolute',
    end: tokens.space[2],
    bottom: tokens.space[2],
    width: ADD,
    height: ADD,
    borderRadius: ADD / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
