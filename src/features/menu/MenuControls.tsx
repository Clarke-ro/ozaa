import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react-native';
import type { MenuCategory } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { FilterChips } from '@/ui/FilterChips';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

export type MenuView = 'list' | 'grid';

/**
 * The menu's fixed control bar, two slim rows that stay put while dishes scroll: search with the
 * diet filter and the list/grid switch, then the sections as the app's filter chips.
 */
export function MenuControls({
  query,
  onQuery,
  diets,
  onFilters,
  view,
  onView,
  sections,
  active,
  onSection,
}: {
  query: string;
  onQuery: (text: string) => void;
  /** How many diet filters are on; shown on the filter button. */
  diets: number;
  /** Null when no dish on this menu has a diet tag, so there is nothing to filter by. */
  onFilters: (() => void) | null;
  view: MenuView;
  onView: (view: MenuView) => void;
  sections: MenuCategory[];
  /** A section id, or 'all'. */
  active: string;
  onSection: (id: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const searching = query.trim().length > 0;

  return (
    <View style={[styles.bar, { backgroundColor: theme.white, borderColor: theme.line }]}>
      <View style={styles.searchRow}>
        <View style={[styles.search, { backgroundColor: theme.wash }]}>
          <Search size={18} color={theme.muted} />
          <TextInput
            value={query}
            onChangeText={onQuery}
            placeholder={t('menu.searchHint')}
            placeholderTextColor={theme.meta}
            accessibilityLabel={t('menu.search')}
            returnKeyType="search"
            style={[styles.input, { color: theme.text }]}
          />
          {searching ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('menu.closeSearch')}
              onPress={() => onQuery('')}
              hitSlop={tokens.space[2]}
            >
              <X size={18} color={theme.muted} />
            </Pressable>
          ) : null}
        </View>
        {onFilters ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              diets > 0 ? t('menu.filtersOn', { count: diets }) : t('menu.filters')
            }
            onPress={onFilters}
            style={({ pressed }) => [
              styles.icon,
              { backgroundColor: diets > 0 || pressed ? theme.tint : theme.wash },
            ]}
          >
            <SlidersHorizontal size={20} color={diets > 0 ? theme.ink : theme.text} />
            {diets > 0 ? (
              <View pointerEvents="none" style={[styles.count, { backgroundColor: theme.fill }]}>
                <Text variant="caption" style={[styles.countText, { color: theme.onFill }]}>
                  {diets}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={view === 'list' ? t('menu.showGrid') : t('menu.showList')}
          onPress={() => onView(view === 'list' ? 'grid' : 'list')}
          style={({ pressed }) => [
            styles.icon,
            { backgroundColor: pressed ? theme.tint : theme.wash },
          ]}
        >
          {view === 'list' ? (
            <LayoutGrid size={20} color={theme.text} />
          ) : (
            <List size={20} color={theme.text} />
          )}
        </Pressable>
      </View>

      {/* While searching, results come from every section, so the section chips step aside. */}
      {searching ? null : (
        <FilterChips
          label={t('menu.sectionsLabel')}
          gutter={tokens.grid.mobile.margin}
          value={active}
          onChange={onSection}
          items={[
            { id: 'all', label: t('menu.allSections') },
            ...sections.map((s) => ({ id: s.id, label: s.name.en })),
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: tokens.space[2],
    paddingVertical: tokens.space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    paddingHorizontal: tokens.grid.mobile.margin,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
  input: {
    flex: 1,
    minHeight: tokens.touchTarget,
    fontFamily: fontFamily.regular,
    fontSize: tokens.type.body.size,
  },
  icon: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    position: 'absolute',
    top: tokens.space[1],
    right: tokens.space[1],
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: tokens.space[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: tokens.type.caption.size - 2, lineHeight: 13 },
});
