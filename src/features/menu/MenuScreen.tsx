import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { isOnGuestMenu, quantityLimits, unitPrice } from '@/lib/dishRules';
import { menuStyleOf, sortDishes } from '@/lib/menuStyle';
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
import { canQuickAdd, searchItems } from '@/lib/dishLogic';
import { dietOptions } from '@/lib/dietary';
import { filterMenuItems } from './filterMenu';
import { MenuCartBar } from './MenuCartBar';
import { DishRow } from './DishRow';
import { MenuControls, type MenuView } from './MenuControls';
import { menuRows, type MenuRow } from './menuRows';
import { guestKeys } from '@/lib/queryKeys';
import { StoreNoticeBanner, useLiveNotices } from '@/features/notices';

/**
 * The guest menu: a fixed bar to search, filter and pick a section, then the dishes as a list
 * (the default) or a grid of photo cards. With every section shown, each gets a heading.
 */
export function MenuScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const menu = useQuery({ queryKey: guestKeys.menu(slug), queryFn: () => api.getMenu(slug) });
  const venue = useVenue(slug);
  const storeNotice = useLiveNotices(venue.data?.notices);
  const add = useCart((state) => state.add);
  const [section, setSection] = useState('all');
  const [diets, setDiets] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Null until the guest switches; until then the venue's chosen layout is used.
  const [picked, setPicked] = useState<MenuView | null>(null);

  if (menu.isLoading) return <LoadingState />;
  if (menu.isError || !menu.data) return <ErrorState onRetry={() => void menu.refetch()} />;

  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const style = menuStyleOf(venue.data?.menuStyle);
  const view: MenuView = picked ?? style.layout;
  // Food sections first, then drinks, each in the venue's order.
  const sections = menu.data.categories
    .filter((c) => !c.hidden)
    .sort((a, b) => (a.kind === b.kind ? a.position - b.position : a.kind === 'food' ? -1 : 1));
  const active = section === 'all' || sections.some((c) => c.id === section) ? section : 'all';
  const visible = sortDishes(menu.data.items, style.itemSort).filter(
    (i) => isOnGuestMenu(i) && sections.some((c) => c.id === i.categoryId),
  );
  const searching = query.trim().length > 0;
  // Searching looks across every section; otherwise show the picked one (or all of them).
  const shown = searching
    ? searchItems(filterMenuItems(visible, 'all', diets), query)
    : filterMenuItems(visible, active, diets);
  const options = dietOptions(visible);
  const columns = width >= 700 ? 3 : 2;
  const rows = menuRows(shown, sections, {
    grouped: active === 'all' && !searching,
    view,
    columns,
  });

  const quickAdd = (item: (typeof shown)[number]) => {
    void hapticImpactLight();
    add(slug, {
      menuItemId: item.id,
      name: item.name.en,
      // Some dishes are sold in twos or more; start at the owner's minimum.
      quantity: quantityLimits(item).min,
      unitPricePesewas: pesewas(unitPrice(item)),
      modifierPesewas: pesewas(0),
      modifierOptionIds: [],
    });
  };
  const open = (id: string) => router.push(`/${slug}/menu/${id}`);

  const renderRow = (row: MenuRow<(typeof shown)[number]>) => {
    if (row.type === 'heading') {
      return (
        <Text variant="title" accessibilityRole="header" style={styles.heading}>
          {row.title}
        </Text>
      );
    }
    if (row.type === 'dish') {
      return (
        <View style={styles.pad}>
          <DishRow
            item={row.item}
            currency={currency}
            onOpen={() => open(row.item.id)}
            onAdd={canQuickAdd(row.item) ? () => quickAdd(row.item) : null}
          />
        </View>
      );
    }
    return (
      <View style={[styles.pad, styles.gridRow]}>
        {row.items.map((item) => (
          <DishCard
            key={item.id}
            item={item}
            currency={currency}
            onOpen={() => open(item.id)}
            onAdd={canQuickAdd(item) ? () => quickAdd(item) : null}
          />
        ))}
        {/* Keep the last row's cards the same width as the rows above. */}
        {Array.from({ length: columns - row.items.length }, (_, i) => (
          <View key={`gap-${i}`} style={styles.filler} />
        ))}
      </View>
    );
  };

  return (
    <SafeScreen>
      <PageHeader title={t('menu.title')} subtitle={venue.data?.name ?? ''} />
      {storeNotice.banner ? <StoreNoticeBanner notice={storeNotice.banner} /> : null}
      <MenuControls
        query={query}
        onQuery={setQuery}
        diets={diets.length}
        onFilters={options.length > 0 ? () => setFiltersOpen(true) : null}
        view={view}
        onView={setPicked}
        sections={sections}
        active={active}
        onSection={setSection}
      />
      {/* FlashList keeps long menus cheap on 2–3 GB phones. */}
      <FlashList
        data={rows}
        keyExtractor={(row) => row.key}
        getItemType={(row) => row.type}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        ItemSeparatorComponent={RowGap}
        ListHeaderComponent={
          <View style={styles.header}>
            <OfflineNote savedAt={menu.dataUpdatedAt} />
            {searching ? (
              <Text variant="title" style={styles.heading}>
                {t('menu.results', { count: shown.length })}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text variant="body" style={[styles.empty, { color: theme.muted }]}>
            {searching || diets.length > 0 ? t('menu.noMatch') : t('menu.empty')}
          </Text>
        }
        renderItem={({ item: row }) => renderRow(row)}
      />
      <MenuCartBar slug={slug} currency={currency} />
      {filtersOpen ? (
        <DietFilterSheet
          options={options}
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
  header: { gap: tokens.space[3] },
  rowGap: { height: tokens.space[3] },
  pad: { paddingHorizontal: tokens.space[4] },
  heading: { paddingHorizontal: tokens.grid.mobile.margin, paddingTop: tokens.space[2] },
  empty: {
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: tokens.space[3],
    textAlign: 'center',
  },
  gridRow: { flexDirection: 'row', gap: tokens.space[3] },
  filler: { flex: 1 },
});

function RowGap() {
  return <View style={styles.rowGap} />;
}
