import { useState, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Animated,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
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
import { useOffers, useVenue } from '@/features/venue';
import { useNow } from '@/lib/useNow';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { OfflineNote } from '@/ui/OfflineNote';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { SpecialOffers } from './SpecialOffers';
import { specialOffers } from './specialOffers';
import { DishCard } from './DishCard';
import { canQuickAdd, searchItems } from '@/lib/dishLogic';
import { filterMenuItems } from './filterMenu';
import { MenuCartBar } from './MenuCartBar';
import { DishRow } from './DishRow';
import { MenuControls, type MenuView } from './MenuControls';
import { menuRows, type MenuRow } from './menuRows';
import { guestKeys } from '@/lib/queryKeys';
import { StoreNoticeBanner, useLiveNotices } from '@/features/notices';

type ListRow<T extends { id: string; categoryId: string }> =
  MenuRow<T> | { type: 'hero'; key: string } | { type: 'controls'; key: string };

/**
 * The guest menu: a fixed bar to search, filter and pick a section, then the dishes as a list
 * (the default) or a grid of photo cards. With every section shown, each gets a heading.
 *
 * With a `hero` (the online-ordering page), the menu is the page: the hero scrolls away above it,
 * the search and section bar sticks to the top, and the venue's name shows in that bar once the
 * hero is gone. Without one (a table guest's Menu page), there's a header with a back button.
 */
export function MenuScreen({ slug, hero }: { slug: string; hero?: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const menu = useQuery({ queryKey: guestKeys.menu(slug), queryFn: () => api.getMenu(slug) });
  const venue = useVenue(slug);
  const storeNotice = useLiveNotices(venue.data?.notices);
  const offers = useOffers(slug);
  // Once a minute is enough to drop an offer that has just ended.
  const now = useNow(60_000);
  const add = useCart((state) => state.add);
  const [section, setSection] = useState('all');
  const [query, setQuery] = useState('');
  // Online page only: one search-and-sections bar that slides up with the page and stops under
  // a slim strip with the venue's name. One bar, not a copy, so screen readers meet it once.
  const [scrollY] = useState(() => new Animated.Value(0));
  const [heroHeight, setHeroHeight] = useState(0);
  const [barHeight, setBarHeight] = useState(0);
  const [pastHero, setPastHero] = useState(false);
  const insets = useSafeAreaInsets();
  const pinnedAt = insets.top + NAME_STRIP;

  if (menu.isLoading) return <LoadingState />;
  if (menu.isError || !menu.data) return <ErrorState onRetry={() => void menu.refetch()} />;

  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const style = menuStyleOf(venue.data?.menuStyle);
  // List or photo grid is the venue's choice (Customise > menu style), not the guest's.
  const view: MenuView = style.layout;
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
    ? searchItems(filterMenuItems(visible, 'all', []), query)
    : filterMenuItems(visible, active, []);
  // Only on the full menu: searching or a single section is about finding one thing.
  const deals =
    searching || active !== 'all' ? [] : specialOffers(visible, offers.data?.items ?? [], now);
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

  const controls = (
    <MenuControls
      query={query}
      onQuery={setQuery}
      sections={sections}
      active={active}
      onSection={setSection}
    />
  );
  const listHeader = (
    <View style={styles.header}>
      <OfflineNote savedAt={menu.dataUpdatedAt} />
      <SpecialOffers
        offers={deals}
        currency={currency}
        onOpen={open}
        onAdd={(deal) => (canQuickAdd(deal.item) ? () => quickAdd(deal.item) : null)}
      />
      {searching ? (
        <Text variant="title" style={styles.heading}>
          {t('menu.results', { count: shown.length })}
        </Text>
      ) : null}
    </View>
  );
  const data: ListRow<(typeof shown)[number]>[] = hero
    ? [{ type: 'hero', key: 'hero' }, { type: 'controls', key: 'controls' }, ...rows]
    : rows;

  const renderRow = (row: ListRow<(typeof shown)[number]>) => {
    if (row.type === 'hero') {
      return (
        <View onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}>
          {hero}
          {listHeader}
        </View>
      );
    }
    if (row.type === 'controls') {
      // Room for the sliding bar, which floats over the list (see below).
      return <View style={{ height: barHeight }} />;
    }
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
    <SafeScreen includeTop={!hero}>
      {hero ? null : <PageHeader title={t('menu.title')} subtitle={venue.data?.name ?? ''} />}
      {storeNotice.banner ? <StoreNoticeBanner notice={storeNotice.banner} /> : null}
      {hero ? null : controls}
      {/* FlashList keeps long menus cheap on 2–3 GB phones. */}
      <FlashList
        data={data}
        keyExtractor={(row) => row.key}
        getItemType={(row) => row.type}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={hero ? styles.scrollHero : styles.scroll}
        ItemSeparatorComponent={RowGap}
        onScroll={
          hero
            ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                useNativeDriver: false,
                listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                  const past = event.nativeEvent.contentOffset.y >= heroHeight - pinnedAt;
                  if (past !== pastHero) setPastHero(past);
                },
              })
            : undefined
        }
        scrollEventThrottle={hero ? 16 : undefined}
        ListHeaderComponent={hero ? null : listHeader}
        ListEmptyComponent={
          <Text variant="body" style={[styles.empty, { color: theme.muted }]}>
            {searching ? t('menu.noMatch') : t('menu.empty')}
          </Text>
        }
        renderItem={({ item: row }) => renderRow(row)}
      />
      {hero ? (
        <>
          {/* Hidden until the hero is measured, so it never flashes at the top first. */}
          <Animated.View
            onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}
            style={[
              styles.floating,
              {
                backgroundColor: theme.bg,
                opacity: heroHeight > 0 ? 1 : 0,
                transform: [
                  {
                    translateY: scrollY.interpolate({
                      inputRange: [0, Math.max(1, heroHeight - pinnedAt)],
                      outputRange: [heroHeight, pinnedAt],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            {controls}
          </Animated.View>
          {pastHero ? (
            <View
              style={[
                styles.nameStrip,
                { height: pinnedAt, paddingTop: insets.top, backgroundColor: theme.bg },
              ]}
            >
              <Text variant="title" numberOfLines={1} accessibilityRole="header">
                {venue.data?.name ?? ''}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
      <MenuCartBar slug={slug} currency={currency} />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120, paddingTop: tokens.space[3] },
  scrollHero: { paddingBottom: 120 },
  floating: { position: 'absolute', top: 0, start: 0, end: 0 },
  nameStrip: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    justifyContent: 'center',
    paddingHorizontal: tokens.grid.mobile.margin,
  },
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

// The slim strip with the venue's name that the bar stops under once the hero has gone.
const NAME_STRIP = 44;

function RowGap() {
  return <View style={styles.rowGap} />;
}
