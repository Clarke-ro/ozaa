import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react-native';
import type { MenuCategory } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

export type MenuView = 'list' | 'grid';

/**
 * The menu's bar: the sections as text tabs with an underline under the one you're on, and small
 * search, diet filter and list/grid buttons at the end. Search opens a field above the tabs.
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
  const [searchOpen, setSearchOpen] = useState(query.length > 0);
  const searching = query.trim().length > 0;
  const tabs = [
    { id: 'all', label: t('menu.allSections') },
    ...sections.map((s) => ({ id: s.id, label: s.name.en })),
  ];
  const icon = (pressed: boolean, on = false) => [
    styles.icon,
    { backgroundColor: on || pressed ? theme.tint : 'transparent' },
  ];

  return (
    <View style={[styles.bar, { backgroundColor: theme.bg, borderColor: theme.line }]}>
      {searchOpen ? (
        <View style={[styles.search, { backgroundColor: theme.wash }]}>
          <Search size={18} color={theme.muted} />
          <TextInput
            value={query}
            onChangeText={onQuery}
            placeholder={t('menu.searchHint')}
            placeholderTextColor={theme.meta}
            accessibilityLabel={t('menu.search')}
            returnKeyType="search"
            autoFocus
            style={[styles.input, { color: theme.text }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('menu.closeSearch')}
            onPress={() => {
              onQuery('');
              setSearchOpen(false);
            }}
            hitSlop={tokens.space[2]}
          >
            <X size={18} color={theme.muted} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.row}>
        {/* While searching, results come from every section, so the tabs step aside. */}
        {searching ? (
          <Text variant="caption" style={[styles.flex, styles.searchNote, { color: theme.muted }]}>
            {t('menu.searchAll')}
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityRole="tablist"
            accessibilityLabel={t('menu.sectionsLabel')}
            style={styles.flex}
            contentContainerStyle={styles.tabs}
          >
            {tabs.map((tab) => {
              const on = tab.id === active;
              return (
                <Pressable
                  key={tab.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  // React Native Web doesn't turn accessibilityState into aria-selected for tabs.
                  aria-selected={on}
                  onPress={() => onSection(tab.id)}
                  style={styles.tab}
                >
                  <Text
                    variant="body"
                    numberOfLines={1}
                    style={[on ? styles.tabOn : null, { color: on ? theme.text : theme.muted }]}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={[styles.underline, { backgroundColor: on ? theme.fill : 'transparent' }]}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        <View style={styles.icons}>
          {searchOpen ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('menu.search')}
              onPress={() => setSearchOpen(true)}
              style={({ pressed }) => icon(pressed)}
            >
              <Search size={20} color={theme.text} />
            </Pressable>
          )}
          {onFilters ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                diets > 0 ? t('menu.filtersOn', { count: diets }) : t('menu.filters')
              }
              onPress={onFilters}
              style={({ pressed }) => icon(pressed, diets > 0)}
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
            style={({ pressed }) => icon(pressed)}
          >
            {view === 'list' ? (
              <LayoutGrid size={20} color={theme.text} />
            ) : (
              <List size={20} color={theme.text} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space[1],
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  tabs: { paddingStart: tokens.grid.mobile.margin - tokens.space[2], paddingEnd: tokens.space[2] },
  tab: {
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[2] + 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabOn: { fontFamily: fontFamily.strong },
  underline: {
    position: 'absolute',
    bottom: 0,
    start: tokens.space[2],
    end: tokens.space[2],
    height: 3,
    borderRadius: 2,
  },
  searchNote: { paddingStart: tokens.grid.mobile.margin },
  icons: { flexDirection: 'row', paddingEnd: tokens.space[2] },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    marginHorizontal: tokens.grid.mobile.margin,
    marginBottom: tokens.space[1],
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
    borderRadius: tokens.radius.full,
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
