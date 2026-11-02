import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CircleCheck, CircleSlash, ImageOff, Pencil, Trash2 } from 'lucide-react-native';
import type { MenuItem } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { useTheme } from '@/ui/theme';
import { Toggle } from '../../kit';

export function MenuItemRow({
  item,
  currency,
  section,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  currency: string;
  /** Shown when the list mixes sections. */
  section?: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const off = !item.available;
  const extras = [
    item.modifierGroups.length
      ? t('ownerMenu.addOns', { count: item.modifierGroups.length })
      : null,
    ...item.dietary.map((d) => t(`dietary.${d}`)),
  ].filter(Boolean);

  return (
    <View
      style={[
        styles.row,
        { borderColor: theme.line, backgroundColor: off ? theme.wash : theme.surface },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ownerMenu.editA11y', { name: item.name.en })}
        onPress={onEdit}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}
      >
        <View style={[styles.thumb, { backgroundColor: theme.wash }]}>
          {item.photo ? (
            <VenueImage url={item.photo.url} alt={item.name.en} style={StyleSheet.absoluteFill} />
          ) : (
            <ImageOff size={20} color={theme.meta} />
          )}
        </View>
        <View style={styles.copy}>
          <Text variant="body-strong" numberOfLines={2} style={off && { color: theme.muted }}>
            {item.name.en}
          </Text>
          {item.description?.en ? (
            <Text variant="caption" numberOfLines={2} style={{ color: theme.muted }}>
              {item.description.en}
            </Text>
          ) : null}
          <Text variant="body-strong" style={styles.price}>
            {formatMoney(pesewas(item.pricePesewas), currency)}
          </Text>
          {section || extras.length ? (
            <Text variant="caption" numberOfLines={2} style={{ color: theme.muted }}>
              {[section, ...extras].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {item.allergens?.length ? (
            <Text variant="caption" numberOfLines={2} style={{ color: theme.warning }}>
              {t('ownerMenu.contains', { list: item.allergens.join(', ') })}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.side}>
        <Toggle
          value={item.available}
          onChange={onToggle}
          label={t('ownerMenu.availableA11y', { name: item.name.en })}
        />
        {/* Word and icon as well as the switch, so state never rests on colour. */}
        <View style={styles.state}>
          {off ? (
            <CircleSlash size={14} color={theme.error} />
          ) : (
            <CircleCheck size={14} color={theme.success} />
          )}
          <Text
            variant="caption"
            style={{ color: off ? theme.error : theme.success, fontFamily: 'Inter_600' }}
          >
            {off ? t('owner.soldOut') : t('owner.onMenu')}
          </Text>
        </View>
        <View style={styles.icons}>
          <IconBtn label={t('ownerMenu.editA11y', { name: item.name.en })} onPress={onEdit}>
            <Pencil size={18} color={theme.text} />
          </IconBtn>
          <IconBtn label={t('ownerMenu.deleteA11y', { name: item.name.en })} onPress={onDelete}>
            <Trash2 size={18} color={theme.error} />
          </IconBtn>
        </View>
      </View>
    </View>
  );
}

function IconBtn({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: pressed ? theme.line : theme.wash },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: tokens.space[3],
    padding: tokens.space[3],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  main: { flex: 1, flexDirection: 'row', gap: tokens.space[3] },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
  price: { fontVariant: ['tabular-nums'], marginTop: tokens.space[1] },
  side: { alignItems: 'flex-end', gap: tokens.space[2] },
  state: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  icons: { flexDirection: 'row', gap: tokens.space[2] },
  iconBtn: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
