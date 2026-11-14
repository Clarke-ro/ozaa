import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, GripVertical, Pencil, Plus } from 'lucide-react-native';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { MenuItemRow } from './MenuItemRow';

/**
 * One menu section as on the design canvas: its name with a grey count, three small icons on
 * the right (rename, hide from guests, reorder sections), then each dish as its own card. An
 * empty section shows a dashed "Add the first dish".
 */
export function SectionGroup({
  section,
  name,
  total,
  dishes,
  currency,
  onAddDish,
  onEditSection,
  onHideSection,
  onSections,
  onEditDish,
  onToggleDish,
}: {
  /** Missing for dishes whose section was deleted. */
  section: MenuCategory | undefined;
  name: string;
  /** Every dish in the section, not just the ones the filter shows. */
  total: number;
  dishes: MenuItem[];
  currency: string;
  onAddDish: () => void;
  onEditSection: () => void;
  onHideSection: () => void;
  onSections: () => void;
  onEditDish: (item: MenuItem) => void;
  onToggleDish: (item: MenuItem) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const hidden = section?.hidden === true;
  const icon = (label: string, Icon: typeof Pencil, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.icon,
        (pressed || hovered) && { backgroundColor: theme.wash },
      ]}
    >
      <Icon size={18} color={theme.muted} />
    </Pressable>
  );
  return (
    <View style={styles.group}>
      <View style={styles.head}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[styles.name, hidden && { color: theme.muted }]}
        >
          {name}
        </Text>
        <View
          accessibilityLabel={t('ownerMenu.dishCount', { count: total })}
          style={[styles.count, { backgroundColor: theme.wash }]}
        >
          <Text style={styles.countText}>{total}</Text>
        </View>
        {hidden ? (
          <Text style={[styles.hidden, { color: theme.meta }]}>{t('ownerMenu.hidden')}</Text>
        ) : null}
        {section ? (
          <View style={styles.icons}>
            {icon(t('ownerMenu.renameSection', { name }), Pencil, onEditSection)}
            {icon(
              hidden
                ? t('ownerMenu.showSectionA11y', { name })
                : t('ownerMenu.hideSectionA11y', { name }),
              hidden ? EyeOff : Eye,
              onHideSection,
            )}
            {icon(t('ownerMenu.reorderSections'), GripVertical, onSections)}
          </View>
        ) : null}
      </View>
      {dishes.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ownerMenu.live.addTo', { name })}
          onPress={onAddDish}
          style={({ pressed }) => [
            styles.empty,
            // Canvas: the first-dish button is white with a dashed edge; "Add a section" stays clear.
            { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.surface },
          ]}
        >
          <Plus size={18} color={theme.muted} />
          <Text style={[styles.emptyText, { color: theme.muted }]}>{t('ownerMenu.addFirst')}</Text>
        </Pressable>
      ) : (
        <View style={styles.rows}>
          {dishes.map((item) => (
            <MenuItemRow
              key={item.id}
              item={item}
              currency={currency}
              onToggle={() => onToggleDish(item)}
              onEdit={() => onEditDish(item)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space[4] },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flexShrink: 1, fontSize: 17, lineHeight: 24, fontFamily: fontFamily.strong },
  count: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.strong },
  hidden: { fontSize: 14, lineHeight: 20 },
  icons: { marginLeft: 'auto', flexDirection: 'row', gap: 2 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rows: { gap: tokens.space[3] },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 80,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.owner.controls.cardRadius,
  },
  emptyText: { fontSize: 16, lineHeight: 22 },
});
