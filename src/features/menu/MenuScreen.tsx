import { useRef, useState, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { asGuestSees, isOnGuestMenu, quantityLimits, unitPrice } from '@/lib/dishRules';
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
import { canOrderHere, useAtTable } from '@/features/session';

/**
 * The guest menu: a bar to search and pick a section, then the dishes as a list (the default)
 * or a grid of photo cards. With every section shown, each gets a heading.
 *
 * With a `hero` (the online-ordering page), the banner scrolls away and the tab bar stays.
 * Without one (a table guest's Menu page), there's a header with a back button.
 *
 * This is a normal scroll view, not FlashList. FlashList v2 asks the phone for the list's
 * size and then draws. On iPhone and Android that answer comes back as 0, so the menu never
 * appears. The browser answers straight away, which is why the same screen showed on the web only.
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
  // Browse only from the venue link when the venue takes no online orders.
  const canOrder = canOrderHere(useAtTable(slug), venue.data);
  const [section, setSection] = useState('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  // True once the banner block has scrolled off and the tab bar is held at the top.
  const [pastHero, setPastHero] = useState(false);
  const [heroHeight, setHeroHeight] = useState(0);
  const scrollRef = useRef<{
    scrollTo: (options: { y: number; animated?: boolean }) => void;
  } | null>(null);
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
  const visible = sortDishes(asGuestSees(menu.data.items, now), style.itemSort).filter(
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

  // A shorter section would otherwise leave you scrolled into blank space.
  const jumpTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setPastHero(false);
  };
  const controls = (
    <MenuControls
      query={query}
      onQuery={(text) => {
        setQuery(text);
        jumpTop();
      }}
      searchOpen={searchOpen}
      onSearchOpen={setSearchOpen}
      sections={sections}
      active={active}
      onSection={(id) => {
        setSection(id);
        jumpTop();
      }}
      background={theme.white}
    />
  );
  const listHeader = (
    <View style={styles.header}>
      <OfflineNote savedAt={menu.dataUpdatedAt} />
      <SpecialOffers
        offers={deals}
        currency={currency}
        onOpen={open}
        onAdd={(deal) => (canOrder && canQuickAdd(deal.item) ? () => quickAdd(deal.item) : null)}
      />
      {searching ? (
        <Text variant="title" style={styles.heading}>
          {t('menu.results', { count: shown.length })}
        </Text>
      ) : null}
    </View>
  );

  const rowView = (row: MenuRow<(typeof shown)[number]>) => {
    if (row.type === 'heading') {
      return (
        <Text key={row.key} variant="title" accessibilityRole="header" style={styles.heading}>
          {row.title}
        </Text>
      );
    }
    if (row.type === 'dish') {
      return (
        <View key={row.key} style={styles.pad}>
          <DishRow
            item={row.item}
            currency={currency}
            onOpen={() => open(row.item.id)}
            onAdd={canOrder && canQuickAdd(row.item) ? () => quickAdd(row.item) : null}
          />
        </View>
      );
    }
    return (
      <View key={row.key} style={[styles.pad, styles.gridRow]}>
        {row.items.map((item) => (
          <DishCard
            key={item.id}
            item={item}
            currency={currency}
            onOpen={() => open(item.id)}
            onAdd={canOrder && canQuickAdd(item) ? () => quickAdd(item) : null}
          />
        ))}
        {/* Keep the last row's cards the same width as the rows above. */}
        {Array.from({ length: columns - row.items.length }, (_, i) => (
          <View key={`gap-${i}`} style={styles.filler} />
        ))}
      </View>
    );
  };

  const dishes =
    rows.length > 0
      ? rows.map(rowView)
      : [
          <Text key="empty" variant="body" style={[styles.empty, { color: theme.muted }]}>
            {searching ? t('menu.noMatch') : t('menu.empty')}
          </Text>,
        ];

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!hero) return;
    const y = event.nativeEvent.contentOffset.y;
    const stuck = heroHeight > 0 && y >= heroHeight;
    setPastHero((on) => (on === stuck ? on : stuck));
  };

  return (
    <SafeScreen includeTop={!hero} background={theme.white}>
      {/* A table guest's menu: a back arrow and the venue's name, on white (design canvas). */}
      {hero ? null : <PageHeader plain title={venue.data?.name ?? t('menu.title')} />}
      {storeNotice.banner ? <StoreNoticeBanner notice={storeNotice.banner} /> : null}
      {hero ? null : controls}
      <ScrollView
        ref={(node) => {
          // The scroll view's own type is the native instance. Keep only the call we use.
          scrollRef.current = node ? { scrollTo: (options) => node.scrollTo(options) } : null;
        }}
        style={styles.fill}
        contentContainerStyle={hero ? styles.scrollHero : styles.scroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={hero ? onScroll : undefined}
        // Child 0 is the banner block. Child 1 is the tab bar, so it stays under the venue name.
        stickyHeaderIndices={hero ? [1] : undefined}
      >
        {hero ? (
          <View
            key="hero"
            collapsable={false}
            onLayout={(event) => {
              const next = event.nativeEvent.layout.height;
              setHeroHeight((height) => (height === next ? height : next));
            }}
          >
            {hero}
            {listHeader}
          </View>
        ) : (
          <View key="header">{listHeader}</View>
        )}
        {hero ? (
          <View key="controls" collapsable={false} style={{ backgroundColor: theme.white }}>
            {pastHero ? (
              <View style={[styles.nameInBar, { height: pinnedAt, paddingTop: insets.top }]}>
                <Text variant="title" numberOfLines={1} accessibilityRole="header">
                  {venue.data?.name ?? ''}
                </Text>
              </View>
            ) : null}
            {controls}
          </View>
        ) : null}
        {dishes}
      </ScrollView>
      {canOrder ? <MenuCartBar slug={slug} currency={currency} /> : null}
    </SafeScreen>
  );
}

// The slim strip with the venue's name that the tab bar stops under once the banner has gone.
const NAME_STRIP = 44;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 120, paddingTop: tokens.space[3] },
  scrollHero: { paddingBottom: 120 },
  nameInBar: {
    justifyContent: 'center',
    paddingHorizontal: tokens.grid.mobile.margin,
  },
  header: { gap: tokens.space[3] },
  pad: { paddingHorizontal: tokens.space[4], marginBottom: tokens.space[3] },
  heading: {
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: tokens.space[2],
    marginBottom: tokens.space[3],
  },
  empty: {
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: tokens.space[3],
    textAlign: 'center',
  },
  gridRow: { flexDirection: 'row', gap: tokens.space[3] },
  filler: { flex: 1 },
});
