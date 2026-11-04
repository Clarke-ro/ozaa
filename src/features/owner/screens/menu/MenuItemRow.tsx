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
import { Toggle } from '../../kit';

const LOW_STOCK = 5;

/**
 * One dish, kept compact: photo, name, price and section, and the on-the-menu switch.
 * Tap the row to edit (delete lives in the editor). Sold out and hidden dim the row and say so in words.
 */
export function MenuItemRow({
  item,
  currency,
  section,
  onToggle,
  onEdit,
}: {
  item: MenuItem;
  currency: string;
  /** Shown when the list mixes sections. */
  section?: string;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const off = !item.available || item.hidden === true;
  const money = (amount: number) => formatMoney(pesewas(amount), currency);
  const meta = [
    onSale(item)
      ? t('ownerMenu.onSale', { price: money(unitPrice(item)) })
      : money(item.pricePesewas),
    section,
    item.hidden ? t('ownerMenu.statusHidden') : !item.available ? t('owner.soldOut') : null,
    // A few left is worth seeing at a glance; plenty or unlimited isn't.
    item.available && item.stockCount != null && item.stockCount <= LOW_STOCK
      ? t('ownerMenu.left', { count: item.stockCount })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.row, { backgroundColor: theme.surface }]}>
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
          <Text
            variant="caption"
            numberOfLines={1}
            // Red only for sold out, which guests notice; hidden is the owner's choice, so it stays grey.
            style={[styles.meta, { color: !item.available ? theme.error : theme.muted }]}
          >
            {meta}
          </Text>
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
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.5 },
  copy: { flex: 1, gap: 2 },
  meta: { fontVariant: ['tabular-nums'] },
});
