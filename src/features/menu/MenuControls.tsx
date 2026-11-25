import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react-native';
import type { MenuCategory } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { guestFont, useTheme } from '@/ui/theme';

export type MenuView = 'list' | 'grid';

/**
 * The menu's bar: a small grey search square, then the sections as text tabs with an underline
 * under the one you're on (design canvas, Clarke 2026-11-23). Search opens a field above the tabs.
 */
export function MenuControls({
  query,
  onQuery,
  searchOpen,
  onSearchOpen,
  autoFocus = true,
  sections,
  active,
  onSection,
  background,
  allTab = true,
}: {
  query: string;
  onQuery: (text: string) => void;
  searchOpen: boolean;
  onSearchOpen: (open: boolean) => void;
  /** The pinned copy and the row in the list both mount. Only the one being used should take focus. */
  autoFocus?: boolean;
  sections: MenuCategory[];
  /** A section id, or 'all'. */
  active: string;
  onSection: (id: string) => void;
  /** Missing = the soft canvas. */
  background?: string;
  /**
   * The guest menu scrolls to a section instead of filtering (BUILD.md 5b.6), so it has no "All"
   * tab. The owner's live preview still filters, and keeps it.
   */
  allTab?: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const searching = query.trim().length > 0;
  const tabs = [
    ...(allTab ? [{ id: 'all', label: t('menu.allSections') }] : []),
    ...sections.map((s) => ({ id: s.id, label: s.name.en })),
  ];
  // As the guest scrolls, the tab for the section they're reading slides into view.
  const tabRow = useRef<{ scrollTo: (options: { x: number; animated?: boolean }) => void } | null>(
    null,
  );
  const tabX = useRef(new Map<string, number>());
  useEffect(() => {
    const x = tabX.current.get(active);
    if (x !== undefined) tabRow.current?.scrollTo({ x: Math.max(0, x - 48), animated: true });
  }, [active]);

  return (
    <View
      style={[styles.bar, { backgroundColor: background ?? theme.bg, borderColor: theme.line }]}
    >
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
            autoFocus={autoFocus}
            style={[styles.input, { color: theme.text }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('menu.closeSearch')}
            onPress={() => {
              onQuery('');
              onSearchOpen(false);
            }}
            hitSlop={tokens.space[2]}
          >
            <X size={18} color={theme.muted} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.row}>
        {searchOpen ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('menu.search')}
            onPress={() => onSearchOpen(true)}
            style={({ pressed }) => [
              styles.square,
              { backgroundColor: pressed ? theme.line : theme.wash },
            ]}
          >
            <Search size={18} color={theme.text} />
          </Pressable>
        )}
        {/* While searching, results come from every section, so the tabs step aside. */}
        {searching ? (
          <Text variant="caption" style={[styles.flex, styles.searchNote, { color: theme.muted }]}>
            {t('menu.searchAll')}
          </Text>
        ) : (
          <ScrollView
            ref={(node) => {
              // Keep only the call we use; the scroll view's own type is the native instance.
              tabRow.current = node ? { scrollTo: (options) => node.scrollTo(options) } : null;
            }}
            horizontal
            nestedScrollEnabled
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
                  onLayout={(event) => tabX.current.set(tab.id, event.nativeEvent.layout.x)}
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
  tabOn: { fontFamily: guestFont.strong },
  underline: {
    position: 'absolute',
    bottom: 0,
    start: tokens.space[2],
    end: tokens.space[2],
    height: 3,
    borderRadius: 2,
  },
  searchNote: { paddingStart: tokens.grid.mobile.margin },
  square: {
    width: 40,
    height: 40,
    marginStart: tokens.grid.mobile.margin,
    marginEnd: tokens.space[1],
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    fontFamily: guestFont.regular,
    fontSize: tokens.type.body.size,
  },
});
