import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { DragList } from '../../kit/DragList';
import { DISH_ROW, MenuItemRow } from './MenuItemRow';

const NARROW_DISH_ROW = 104;

/**
 * One menu section: its name with a grey count, then each dish as its own card. Hold the grip
 * on a dish's left and drag to change its place; tap the dish to edit it; its switch takes it on
 * or off the menu. Renaming, hiding and ordering sections lives in the ⋮ menu's Sections, so the
 * heading stays clean (Clarke, 2026-11-14). An empty section shows a dashed "Add the first dish".
 */
export function SectionGroup({
  section,
  name,
  total,
  dishes,
  currency,
  timeZone,
  draggable,
  onAddDish,
  onEditDish,
  onToggleDish,
  onReorder,
}: {
  /** Missing for dishes whose section was deleted. */
  section: MenuCategory | undefined;
  name: string;
  /** Every dish in the section, not just the ones the filter shows. */
  total: number;
  dishes: MenuItem[];
  currency: string;
  /** The venue's clock, for "Back at 17:00". */
  timeZone: string;
  /** Off while a search is narrowing the list, when a dragged place would mean nothing. */
  draggable: boolean;
  onAddDish: () => void;
  onEditDish: (item: MenuItem) => void;
  onToggleDish: (item: MenuItem) => void;
  onReorder: (dishes: MenuItem[], orderedIds: string[]) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { fontScale, width } = useWindowDimensions();
  // Narrow rows need another text line for price and status labels.
  const baseDishRowHeight = width < 360 ? NARROW_DISH_ROW : DISH_ROW;
  const dishRowHeight = Math.ceil(baseDishRowHeight * Math.max(1, fontScale));
  const hidden = section?.hidden === true;
  const row = (item: MenuItem, bare: boolean) => (
    <MenuItemRow
      key={item.id}
      item={item}
      currency={currency}
      timeZone={timeZone}
      onToggle={() => onToggleDish(item)}
      onEdit={() => onEditDish(item)}
      bare={bare}
    />
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
      </View>
      {dishes.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ownerMenu.live.addTo', { name })}
          onPress={onAddDish}
          style={({ pressed }) => [
            styles.empty,
            { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.surface },
          ]}
        >
          <Plus size={16} color={theme.muted} />
          <Text style={[styles.emptyText, { color: theme.muted }]}>{t('ownerMenu.addFirst')}</Text>
        </Pressable>
      ) : draggable && dishes.length > 1 ? (
        <DragList
          items={dishes.map((d) => ({ key: d.id, label: d.name.en, dish: d }))}
          rowHeight={dishRowHeight}
          gripSide="start"
          onOrder={(ids) => onReorder(dishes, ids)}
          renderRow={(entry) => row(entry.dish, true)}
        />
      ) : (
        <View style={styles.rows}>{dishes.map((item) => row(item, false))}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space[3] },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  name: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  count: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.strong },
  hidden: { fontSize: 13, lineHeight: 18 },
  rows: { gap: tokens.space[2] },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
    minHeight: 56,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.owner.controls.cardRadius,
  },
  emptyText: { fontSize: 14, lineHeight: 20 },
});
