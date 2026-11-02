import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import type { MenuCategory } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

export type Kind = 'food' | 'drinks';

/**
 * The menu's fixed control bar, two slim rows that stay put while dishes scroll:
 * search with the diet filter beside it, then Food / Drinks and the sections as small pills.
 */
export function MenuControls({
  query,
  onQuery,
  diets,
  onFilters,
  kind,
  onKind,
  sections,
  active,
  onSection,
}: {
  query: string;
  onQuery: (text: string) => void;
  /** How many diet filters are on; shown on the filter button. */
  diets: number;
  onFilters: () => void;
  kind: Kind;
  onKind: (kind: Kind) => void;
  sections: MenuCategory[];
  active: string | undefined;
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={diets > 0 ? t('menu.filtersOn', { count: diets }) : t('menu.filters')}
          onPress={onFilters}
          style={({ pressed }) => [
            styles.filter,
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
      </View>

      {/* While searching, results come from every section, so the section pills step aside. */}
      {searching ? null : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
        >
          <View accessibilityRole="tablist" style={[styles.kinds, { backgroundColor: theme.wash }]}>
            {(['food', 'drinks'] as const).map((tab) => {
              const on = kind === tab;
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  aria-selected={on}
                  onPress={() => onKind(tab)}
                  style={[styles.kind, on && { backgroundColor: theme.black }]}
                >
                  <Text
                    variant="caption"
                    style={{ color: on ? theme.white : theme.muted, fontFamily: fontFamily.strong }}
                  >
                    {t(`menu.${tab}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.divider, { backgroundColor: theme.line }]} />
          <View accessibilityRole="tablist" style={styles.sections}>
            {sections.map((section) => {
              const on = section.id === active;
              return (
                <Pressable
                  key={section.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  aria-selected={on}
                  accessibilityLabel={section.name.en}
                  onPress={() => onSection(section.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: on ? theme.tint : theme.white,
                      borderColor: on ? theme.ink : theme.line,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    numberOfLines={1}
                    style={{
                      color: on ? theme.badgeInk : theme.text,
                      fontFamily: on ? fontFamily.strong : fontFamily.regular,
                    }}
                  >
                    {section.name.en}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const PILL = 32;

const styles = StyleSheet.create({
  bar: {
    gap: tokens.space[2],
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[2],
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
  filter: {
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
  pills: {
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.grid.mobile.margin,
  },
  kinds: { flexDirection: 'row', padding: 2, borderRadius: tokens.radius.full },
  kind: {
    height: PILL - 4,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { width: StyleSheet.hairlineWidth, height: PILL - 12 },
  sections: { flexDirection: 'row', gap: tokens.space[2] },
  chip: {
    height: PILL,
    paddingHorizontal: tokens.space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
