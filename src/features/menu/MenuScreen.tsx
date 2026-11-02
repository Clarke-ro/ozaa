import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { hapticImpactLight } from '@/lib/haptics';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { useCart } from '@/features/cart';
import { useVenue } from '@/features/venue';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { OfflineNote } from '@/ui/OfflineNote';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { DietFilterSheet } from './DietFilterSheet';
import { DishCard } from './DishCard';
import { canQuickAdd, searchItems } from './dishLogic';
import { filterMenuItems, type DietTag } from './filterMenu';
import { MenuCartBar } from './MenuCartBar';
import { MenuControls, type Kind } from './MenuControls';

/** The guest menu: a fixed bar to search, filter and pick food, drinks or a section, then the dishes. */
export function MenuScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const menu = useQuery({ queryKey: ['menu', slug], queryFn: () => api.getMenu(slug) });
  const venue = useVenue(slug);
  const add = useCart((state) => state.add);
  const [kind, setKind] = useState<Kind>('food');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [diets, setDiets] = useState<DietTag[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      <PageHeader title={t('menu.title')} subtitle={venue.data?.name ?? ''} />
      <MenuControls
        query={query}
        onQuery={setQuery}
        diets={diets.length}
        onFilters={() => setFiltersOpen(true)}
        kind={kind}
        onKind={(next) => {
          setKind(next);
          setSectionId(null);
        }}
        sections={sections}
        active={active}
        onSection={setSectionId}
      />
      {/* FlashList keeps long sections cheap on 2–3 GB phones. */}
      <FlashList
        data={shown.length === 0 ? [] : rows}
        keyExtractor={(row) => row.map((item) => item.id).join('|')}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={RowGap}
        ListHeaderComponent={
          <View style={styles.header}>
            <OfflineNote savedAt={menu.dataUpdatedAt} />
            <Text variant="title" style={styles.heading}>
              {query.trim()
                ? t('menu.results', { count: shown.length })
                : sections.find((c) => c.id === active)?.name.en}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text variant="body" style={[styles.empty, { color: theme.muted }]}>
            {query.trim() || diets.length > 0 ? t('menu.noMatch') : t('menu.empty')}
          </Text>
        }
        renderItem={({ item: row }) => (
          <View style={styles.gridRow}>
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
        )}
      />
      <MenuCartBar slug={slug} currency={currency} />
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
  scroll: { paddingBottom: 120, paddingTop: tokens.space[3] },
  header: { gap: tokens.space[3], paddingBottom: tokens.space[3] },
  rowGap: { height: tokens.space[3] },
  heading: { paddingHorizontal: tokens.grid.mobile.margin },
  empty: {
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: tokens.space[3],
    textAlign: 'center',
  },
  gridRow: { flexDirection: 'row', gap: tokens.space[3], paddingHorizontal: tokens.space[4] },
  filler: { flex: 1 },
});

function RowGap() {
  return <View style={styles.rowGap} />;
}
