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
import { useTheme } from '@/ui/theme';
import { StatusPill, Toggle } from '../../kit';

const LOW_STOCK = 5;
const THUMB = tokens.space[12] + tokens.space[2];

/**
 * One dish as a row inside its section card: photo, name and a line of description, any state
 * worth a glance (sold out, hidden, a few left, popular) as small pills, the price on the right,
 * and the on-the-menu switch. Tap the row to edit; delete lives in the editor.
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
  const description = item.description?.en?.trim();

  return (
    <View style={styles.row}>
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
          <Text variant="body-strong" numberOfLines={1} style={off && { color: theme.muted }}>
            {item.name.en}
          </Text>
          {description ? (
            <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
              {description}
            </Text>
          ) : null}
          <View style={styles.pills}>
            {/* Red only for sold out, which guests notice; hidden is the owner's choice. */}
            {!item.available ? <StatusPill label={t('owner.soldOut')} tone="error" boxed /> : null}
            {item.hidden ? (
              <StatusPill label={t('ownerMenu.statusHidden')} tone="neutral" boxed />
            ) : null}
            {few ? <StatusPill label={few} tone="waiting" boxed /> : null}
            {item.badges.includes('popular') ? (
              <StatusPill label={t('ownerMenu.filter.popular')} tone="neutral" boxed />
            ) : null}
          </View>
        </View>
        <View style={styles.price}>
          <Text variant="body-strong" style={[styles.num, sale && { color: theme.ink }]}>
            {money(sale ? unitPrice(item) : item.pricePesewas)}
          </Text>
          {sale ? (
            <Text variant="caption" style={[styles.num, styles.was, { color: theme.meta }]}>
              {money(item.pricePesewas)}
            </Text>
          ) : null}
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
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[4],
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: tokens.radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.5 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[1] },
  price: { alignItems: 'flex-end' },
  num: { fontVariant: ['tabular-nums'] },
  was: { textDecorationLine: 'line-through' },
});
