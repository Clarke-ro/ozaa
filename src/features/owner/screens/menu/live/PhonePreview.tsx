import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuCategory, MenuItem, VenueSettings } from '@/lib/api/types';
import { searchItems } from '@/lib/dishLogic';
import { menuStyleOf, sortDishes } from '@/lib/menuStyle';
import { useNow } from '@/lib/useNow';
import { MenuControls, SpecialOffers, specialOffers } from '@/features/menu';
import { OnlineHero } from '@/features/online';
import { useOffers } from '@/features/venue';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { ThemeProvider, themeFromAccent, useTheme, type FontPair } from '@/ui/theme';
import { PhoneFrame } from './PhoneFrame';
import { PreviewSection } from './PreviewSection';

export type PreviewActions = {
  onEditDish: (dish: MenuItem) => void;
  onAddDish: (sectionId: string) => void;
  onEditSection: (section: MenuCategory) => void;
  onReorder: (section: MenuCategory, dishes: MenuItem[]) => void;
};

/** The guest pages' theme: the venue's colour and font, light or dark as its menu style says. */
export function guestTheme(venue: VenueSettings) {
  const font = venue.theme.fontPair;
  const fontPair: FontPair = font === 'serif' || font === 'bold' ? font : 'cravins';
  // "Follow phone" previews as light; the owner can switch to Dark to see that version.
  const scheme = menuStyleOf(venue.menuStyle).colorScheme === 'dark' ? 'dark' : 'light';
  return themeFromAccent(venue.theme.accent, fontPair, scheme);
}

/**
 * The guest menu inside a phone frame, in the venue's own colours. Online is the menu-link page
 * (banner, name, tabs). Table is the menu a guest opens from the table home. Dishes use the same
 * cards guests see, and every tap still edits.
 */
export function PhonePreview({
  venue,
  sections,
  dishes,
  actions,
  variant = 'online',
}: {
  venue: VenueSettings;
  sections: MenuCategory[];
  dishes: MenuItem[];
  actions: PreviewActions;
  /** Menu link, or the menu opened from a table. */
  variant?: 'online' | 'table';
}) {
  const style = menuStyleOf(venue.menuStyle);
  return (
    <ThemeProvider theme={guestTheme(venue)}>
      <PhoneBody
        venue={venue}
        sections={sections}
        dishes={sortDishes(dishes, style.itemSort)}
        manual={style.itemSort === 'manual'}
        actions={actions}
        variant={variant}
      />
    </ThemeProvider>
  );
}

function PhoneBody({
  venue,
  sections,
  dishes,
  manual,
  actions,
  variant,
}: {
  venue: VenueSettings;
  sections: MenuCategory[];
  dishes: MenuItem[];
  manual: boolean;
  actions: PreviewActions;
  variant: 'online' | 'table';
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [section, setSection] = useState('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const offers = useOffers(venue.slug);
  const now = useNow(60_000);
  const searching = query.trim().length > 0;
  const active = section === 'all' || sections.some((s) => s.id === section) ? section : 'all';
  const inView =
    searching || active === 'all' ? dishes : dishes.filter((d) => d.categoryId === active);
  const shownDishes = searching ? searchItems(inView, query) : inView;
  // An empty section stays, so the owner can add its first dish. A search only keeps hits.
  const shownSections = searching
    ? sections.filter((s) => shownDishes.some((d) => d.categoryId === s.id))
    : active === 'all'
      ? sections
      : sections.filter((s) => s.id === active);
  const deals =
    searching || active !== 'all' ? [] : specialOffers(dishes, offers.data?.items ?? [], now);

  const openDish = (id: string) => {
    const dish = dishes.find((item) => item.id === id);
    if (dish) actions.onEditDish(dish);
  };

  return (
    <PhoneFrame label={t('ownerMenu.live.phone')}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {variant === 'online' ? (
          // Share, language and Info would leave this screen. The picture stays; the dishes edit.
          <View pointerEvents="none">
            <OnlineHero venue={venue} topInset={tokens.space[3]} />
          </View>
        ) : (
          <Text variant="title" style={styles.tableTitle}>
            {venue.name}
          </Text>
        )}
        {variant === 'online' ? (
          <SpecialOffers
            offers={deals}
            currency={venue.currency}
            onOpen={openDish}
            onAdd={() => null}
          />
        ) : null}
        <MenuControls
          query={query}
          onQuery={setQuery}
          searchOpen={searchOpen}
          onSearchOpen={setSearchOpen}
          sections={sections}
          active={active}
          onSection={setSection}
        />
        {variant === 'table' ? (
          <SpecialOffers
            offers={deals}
            currency={venue.currency}
            onOpen={openDish}
            onAdd={() => null}
          />
        ) : null}
        <View style={styles.body}>
          {shownSections.map((item) => {
            const inSection = shownDishes.filter((dish) => dish.categoryId === item.id);
            return (
              <PreviewSection
                key={item.id}
                section={item}
                dishes={inSection}
                currency={venue.currency}
                canReorder={manual && !searching}
                onEditDish={actions.onEditDish}
                onAddDish={() => actions.onAddDish(item.id)}
                onEditSection={() => actions.onEditSection(item)}
                onReorder={() => actions.onReorder(item, inSection)}
              />
            );
          })}
          {shownSections.length === 0 ? (
            <Text variant="body" style={{ color: theme.muted, textAlign: 'center' }}>
              {searching ? t('menu.noMatch') : t('menu.empty')}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: tokens.space[8] },
  tableTitle: {
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: tokens.space[4],
  },
  body: { padding: tokens.space[4], gap: tokens.space[6] },
});
