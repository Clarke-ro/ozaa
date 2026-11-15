import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ImageOff } from 'lucide-react-native';
import type { MenuItem } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { onSale, unitPrice } from '@/lib/dishRules';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { fontFamily, useTheme } from '@/ui/theme';
import { STATUS_TONES } from '@/theme/palette';
import { cardStyle, StatusPill, Toggle } from '../../kit';

const LOW_STOCK = 5;
// A 52 px photo with 10 px corners.
const THUMB = 52;
/** Every dish row is this tall, so the drag list can map a drag distance to a position. */
export const DISH_ROW = 72;

/**
 * One dish: photo, name, then the price with any state worth a glance (Popular, sold out,
 * hidden, a few left) on the same line, and the on-the-menu switch. Two lines at most, so every
 * card is the same height. Tap the card to edit; delete lives in the editor.
 * `bare` drops the card look when the drag list draws the card around it.
 */
export function MenuItemRow({
  item,
  currency,
  onToggle,
  onEdit,
  bare,
}: {
  item: MenuItem;
  currency: string;
  onToggle: () => void;
  onEdit: () => void;
  bare?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const off = !item.available || item.hidden === true;
  const money = (amount: number) => formatMoney(pesewas(amount), currency);
  const sale = onSale(item);
  const few =
    item.available && item.stockCount != null && item.stockCount <= LOW_STOCK
      ? t('ownerMenu.left', { count: item.stockCount })
      : null;
  const popular = STATUS_TONES[theme.scheme].order;

  return (
    <View style={[bare ? styles.bare : [cardStyle(theme), styles.row]]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ownerMenu.editA11y', { name: item.name.en })}
        onPress={onEdit}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}
      >
        <View style={[styles.thumb, { backgroundColor: theme.wash }, off && styles.dim]}>
          {item.photo ? (
            <VenueImage url={item.photo.url} alt={item.name.en} style={StyleSheet.absoluteFill} />
          ) : (
            <ImageOff size={16} color={theme.meta} />
          )}
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.name, off && { color: theme.muted }]}>
            {item.name.en}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, sale && { color: theme.ink }]}>
              {money(sale ? unitPrice(item) : item.pricePesewas)}
            </Text>
            {sale ? (
              <Text style={[styles.small, styles.was, { color: theme.meta }]}>
                {money(item.pricePesewas)}
              </Text>
            ) : null}
            {/* Red only for sold out, which guests notice; hidden is the owner's choice. */}
            {!item.available ? <StatusPill label={t('owner.soldOut')} tone="error" boxed /> : null}
            {item.hidden ? (
              <StatusPill label={t('ownerMenu.statusHidden')} tone="neutral" boxed />
            ) : null}
            {few ? <StatusPill label={few} tone="waiting" boxed /> : null}
            {item.badges.includes('popular') ? (
              <View style={[styles.tag, { backgroundColor: popular.bg }]}>
                <Text style={[styles.tagText, { color: popular.ink }]} numberOfLines={1}>
                  {t('ownerMenu.filter.popular')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
      <Toggle
        value={item.available}
        onChange={onToggle}
        label={t('ownerMenu.availableA11y', { name: item.name.en })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    height: DISH_ROW,
    paddingLeft: 10,
    paddingRight: tokens.space[4],
  },
  bare: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingRight: tokens.space[4],
  },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.5 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.strong },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  price: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
  small: { fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  was: { textDecorationLine: 'line-through' },
  tag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: tokens.radius.full },
  tagText: { fontSize: 11, lineHeight: 15, fontFamily: fontFamily.strong },
});
