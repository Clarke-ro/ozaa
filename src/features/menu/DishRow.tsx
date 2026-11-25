import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, UtensilsCrossed } from 'lucide-react-native';
import type { MenuItem } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { guestFont, useTheme } from '@/ui/theme';
import { DishPrice } from './DishPrice';
import { priceFrom } from './guestMenu';

/**
 * One dish in the list view (the default), as a card: name, two lines of description and the
 * price on the left; the photo fills the right side, with the round add button on its corner
 * (design canvas, Clarke 2026-11-23). Sold out dims the photo and says so in words.
 */
export function DishRow({
  item,
  currency,
  onOpen,
  onAdd,
  back = null,
}: {
  item: MenuItem;
  currency: string;
  onOpen: () => void;
  onAdd: (() => void) | null;
  /** "17:00" when a sold-out dish comes back by itself (snoozed), shown instead of Sold out. */
  back?: string | null;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const off = !item.available;
  const popular = item.badges.includes('popular') && !off;
  return (
    <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          off
            ? `${item.name.en}, ${back ? t('menu.backAt', { time: back }) : t('menu.soldOut')}`
            : item.name.en
        }
        onPress={onOpen}
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
      >
        <View style={styles.copy}>
          <Text variant="body" numberOfLines={2} style={styles.name}>
            {item.name.en}
          </Text>
          {item.description?.en ? (
            <Text variant="caption" numberOfLines={2} style={{ color: theme.muted }}>
              {item.description.en}
            </Text>
          ) : null}
          <View style={styles.meta}>
            <DishPrice item={item} currency={currency} from={priceFrom(item)} />
          </View>
          {popular || off ? (
            <Text
              variant="caption"
              style={[styles.tag, { color: off ? theme.error : theme.badgeInk }]}
            >
              {off
                ? back
                  ? t('menu.backAt', { time: back })
                  : t('menu.soldOut')
                : t('menu.popular')}
            </Text>
          ) : null}
        </View>
        <View style={[styles.photo, { backgroundColor: theme.wash }]}>
          {item.photo ? (
            <VenueImage
              url={item.photo.url}
              alt={item.photo.alt ?? item.name.en}
              blurhash={item.photo.blurhash}
              style={[StyleSheet.absoluteFill, off && styles.dim]}
            />
          ) : (
            <UtensilsCrossed size={24} color={theme.meta} />
          )}
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
          <Plus size={18} color={theme.onFill} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

// The photo fills the card's right side; the add button sits on its lower corner.
const CARD = 124;
const PHOTO = 100;
const ADD = 32;

const styles = StyleSheet.create({
  card: {
    minHeight: CARD,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(17, 17, 17, 0.05)',
  },
  open: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  pressed: { opacity: 0.85 },
  copy: {
    flex: 1,
    gap: 2,
    paddingVertical: tokens.space[3],
    paddingStart: tokens.space[4],
    paddingEnd: tokens.space[3],
    justifyContent: 'center',
  },
  name: { fontFamily: guestFont.strong },
  photo: {
    width: PHOTO,
    minHeight: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.45 },
  meta: { marginTop: tokens.space[1] },
  tag: { fontFamily: guestFont.strong },
  add: {
    position: 'absolute',
    end: tokens.space[2] + 1,
    bottom: tokens.space[2] + 1,
    width: ADD,
    height: ADD,
    borderRadius: ADD / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
