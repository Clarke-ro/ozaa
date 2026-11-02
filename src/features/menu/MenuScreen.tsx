import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { hapticImpactLight } from '@/lib/haptics';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { cartCount, cartEstimate, useCart } from '@/features/cart';
import { useVenue } from '@/features/venue';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { useTheme } from '@/ui/theme';
import { DietFilterSheet } from './DietFilterSheet';
import { DishCard } from './DishCard';
import { canQuickAdd, searchItems } from './dishLogic';
import { filterMenuItems, type DietTag } from './filterMenu';
import { SectionRail } from './SectionRail';

type Kind = 'food' | 'drinks';

/** The guest menu: food or drinks, sections as pictures, and the dishes as a grid of cards. */
export function MenuScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const menu = useQuery({ queryKey: ['menu', slug], queryFn: () => api.getMenu(slug) });
  const venue = useVenue(slug);
  const lines = useCart((state) => state.lines);
  const add = useCart((state) => state.add);
  const [kind, setKind] = useState<Kind>('food');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [diets, setDiets] = useState<DietTag[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  if (menu.isLoading) return <LoadingState />;
  if (menu.isError || !menu.data) return <ErrorState onRetry={() => void menu.refetch()} />;

  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const sections = menu.data.categories
    .filter((c) => c.kind === kind && !c.hidden)
    .sort((a, b) => a.position - b.position);
  const active =
    sectionId && sections.some((c) => c.id === sectionId) ? sectionId : sections[0]?.id;
  const inKind = menu.data.items.filter((i) => sections.some((c) => c.id === i.categoryId));
  // While searching, look across every section of this kind; otherwise show the picked section.
  const shown = query.trim()
    ? searchItems(
        inKind.filter((i) => diets.every((tag) => i.dietary.includes(tag))),
        query,
      )
    : filterMenuItems(menu.data.items, active, diets);
  const columns = width >= 700 ? 3 : 2;
  const rows = Array.from({ length: Math.ceil(shown.length / columns) }, (_, r) =>
    shown.slice(r * columns, r * columns + columns),
  );

  const quickAdd = (item: (typeof shown)[number]) => {
    void hapticImpactLight();
    add(slug, {
      menuItemId: item.id,
      name: item.name.en,
      quantity: 1,
      unitPricePesewas: pesewas(item.pricePesewas),
      modifierPesewas: pesewas(0),
      modifierOptionIds: [],
    });
  };

  return (
    <SafeScreen>
      <PageHeader
        title={t('menu.title')}
        subtitle={venue.data?.name ?? ''}
        right={
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                diets.length > 0 ? t('menu.filtersOn', { count: diets.length }) : t('menu.filters')
              }
              onPress={() => setFiltersOpen(true)}
              style={styles.headerIcon}
            >
              <SlidersHorizontal color={theme.black} size={22} strokeWidth={2} />
              {diets.length > 0 ? (
                <View pointerEvents="none" style={[styles.count, { backgroundColor: theme.fill }]}>
                  <Text variant="caption" style={[styles.countText, { color: theme.onFill }]}>
                    {diets.length}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={searching ? t('menu.closeSearch') : t('menu.search')}
              onPress={() => {
                setSearching((on) => !on);
                setQuery('');
              }}
              style={styles.headerIcon}
            >
              {searching ? (
                <X color={theme.black} size={22} />
              ) : (
                <Search color={theme.black} size={22} strokeWidth={2} />
              )}
            </Pressable>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {searching ? (
          <View style={[styles.search, { borderColor: theme.line, backgroundColor: theme.wash }]}>
            <Search size={18} color={theme.muted} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={t('menu.searchHint')}
              placeholderTextColor={theme.meta}
              accessibilityLabel={t('menu.search')}
              returnKeyType="search"
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
        ) : null}
        <View style={[styles.kinds, { backgroundColor: theme.wash }]} accessibilityRole="tablist">
          {(['food', 'drinks'] as const).map((tab) => {
            const on = kind === tab;
            return (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                aria-selected={on}
                onPress={() => {
                  setKind(tab);
                  setSectionId(null);
                }}
                style={[styles.kind, on && { backgroundColor: theme.white }]}
              >
                <Text variant="body-strong" style={{ color: on ? theme.text : theme.muted }}>
                  {t(`menu.${tab}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {query.trim() ? null : (
          <SectionRail
            sections={sections}
            items={menu.data.items}
            active={active}
            onPick={setSectionId}
          />
        )}
        <Text variant="title" style={styles.heading}>
          {query.trim()
            ? t('menu.results', { count: shown.length })
            : sections.find((c) => c.id === active)?.name.en}
        </Text>
        {shown.length === 0 ? (
          <Text variant="body" style={[styles.empty, { color: theme.muted }]}>
            {query.trim() || diets.length > 0 ? t('menu.noMatch') : t('menu.empty')}
          </Text>
        ) : (
          <View style={styles.grid}>
            {rows.map((row, r) => (
              <View key={r} style={styles.gridRow}>
                {row.map((item) => (
                  <DishCard
                    key={item.id}
                    item={item}
                    currency={currency}
                    onOpen={() => router.push(`/${slug}/menu/${item.id}`)}
                    onAdd={canQuickAdd(item) ? () => quickAdd(item) : null}
                  />
                ))}
                {/* Keep the last row's cards the same width as the rows above. */}
                {Array.from({ length: columns - row.length }, (_, i) => (
                  <View key={`gap-${i}`} style={styles.filler} />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      {cartCount(lines) > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/${slug}/order`)}
          style={({ pressed }) => [
            styles.bar,
            { backgroundColor: pressed ? theme.pressed : theme.fill },
          ]}
        >
          <Text variant="button" style={{ color: theme.onFill }}>
            {cartCount(lines)} {t('menu.viewOrder')}
          </Text>
          <Text variant="button" style={{ color: theme.onFill, fontVariant: ['tabular-nums'] }}>
            {formatMoney(cartEstimate(lines), currency)}
          </Text>
        </Pressable>
      ) : null}
      {filtersOpen ? (
        <DietFilterSheet
          selected={diets}
          onApply={(tags) => {
            setDiets(tags);
            setFiltersOpen(false);
          }}
          onClear={() => {
            setDiets([]);
            setFiltersOpen(false);
          }}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  count: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 11, lineHeight: 13 },
  scroll: { paddingBottom: 120, gap: 16, paddingTop: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingLeft: 12,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
  },
  searchInput: { flex: 1, minHeight: 46, fontSize: 16, fontFamily: 'Inter_400' },
  kinds: { flexDirection: 'row', marginHorizontal: 20, padding: 3, borderRadius: 14 },
  kind: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { paddingHorizontal: 20 },
  empty: { paddingHorizontal: 20, paddingTop: 12, textAlign: 'center' },
  grid: { paddingHorizontal: 16, gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  filler: { flex: 1 },
  bar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
