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
// Canvas dish card: a 60 px photo with 10 px corners.
const THUMB = 60;

/**
 * One dish as its own card (design canvas): photo, name with a "Popular" tag, the price under
 * it, any state worth a glance (sold out, hidden, a few left), and the on-the-menu switch.
 * Tap the card to edit; delete lives in the editor.
 */
export function MenuItemRow({
  item,
  currency,
  onToggle,
  onEdit,
}: {
  item: MenuItem;
  currency: string;
  onToggle: () => void;
  onEdit: () => void;
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
    <View style={[cardStyle(theme), styles.row]}>
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
            <ImageOff size={18} color={theme.meta} />
          )}
        </View>
        <View style={styles.copy}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={[styles.name, off && { color: theme.muted }]}>
              {item.name.en}
            </Text>
            {item.badges.includes('popular') ? (
              <View style={[styles.tag, { backgroundColor: popular.bg }]}>
                <Text style={[styles.tagText, { color: popular.ink }]}>
                  {t('ownerMenu.filter.popular')}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.price, sale && { color: theme.ink }]}>
              {money(sale ? unitPrice(item) : item.pricePesewas)}
            </Text>
            {sale ? (
              <Text variant="caption" style={[styles.num, styles.was, { color: theme.meta }]}>
                {money(item.pricePesewas)}
              </Text>
            ) : null}
          </View>
          <View style={styles.pills}>
            {/* Red only for sold out, which guests notice; hidden is the owner's choice. */}
            {!item.available ? <StatusPill label={t('owner.soldOut')} tone="error" boxed /> : null}
            {item.hidden ? (
              <StatusPill label={t('ownerMenu.statusHidden')} tone="neutral" boxed />
            ) : null}
            {few ? <StatusPill label={few} tone="waiting" boxed /> : null}
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
    gap: 14,
    minHeight: 80,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 18,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.5 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  name: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  tag: { paddingHorizontal: tokens.space[2], paddingVertical: 2, borderRadius: tokens.radius.full },
  tagText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.strong },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[2] },
  price: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[1] },
  num: { fontVariant: ['tabular-nums'] },
  was: { textDecorationLine: 'line-through' },
});
