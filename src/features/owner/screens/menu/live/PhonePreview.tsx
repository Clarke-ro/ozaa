import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuCategory, MenuItem, VenueSettings } from '@/lib/api/types';
import { menuStyleOf, sortDishes } from '@/lib/menuStyle';
import { FilterChips } from '@/ui/FilterChips';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { ThemeProvider, themeFromAccent, useTheme, type FontPair } from '@/ui/theme';
import { PreviewSection } from './PreviewSection';

// The width the guest renders are drawn at (BUILD.md: 390×844), so the preview matches them.
const PHONE_WIDTH = 390;

export type PreviewActions = {
  onEditDish: (dish: MenuItem) => void;
  onAddDish: (sectionId: string) => void;
  onEditSection: (section: MenuCategory) => void;
  onReorder: (section: MenuCategory, dishes: MenuItem[]) => void;
};

/**
 * The guest menu inside a phone frame, in the venue's own colours, font and light or dark, built
 * from the same dish rows guests see. Every tap edits: a dish opens its editor, and each section
 * has Add dish, Edit and (with "Your order") Reorder.
 */
export function PhonePreview({
  venue,
  sections,
  dishes,
  actions,
}: {
  venue: VenueSettings;
  sections: MenuCategory[];
  dishes: MenuItem[];
  actions: PreviewActions;
}) {
  const style = menuStyleOf(venue.menuStyle);
  const font = venue.theme.fontPair;
  const fontPair: FontPair = font === 'serif' || font === 'bold' ? font : 'ozaa';
  // "Follow phone" previews as light; the owner can switch to Dark to see that version.
  const scheme = style.colorScheme === 'dark' ? 'dark' : 'light';
  const theme = themeFromAccent(venue.theme.accent, fontPair, scheme);
  return (
    <ThemeProvider theme={theme}>
      <PhoneBody
        venue={venue}
        sections={sections}
        dishes={sortDishes(dishes, style.itemSort)}
        manual={style.itemSort === 'manual'}
        actions={actions}
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
}: {
  venue: VenueSettings;
  sections: MenuCategory[];
  dishes: MenuItem[];
  manual: boolean;
  actions: PreviewActions;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [chip, setChip] = useState('all');
  const shown = chip === 'all' ? sections : sections.filter((s) => s.id === chip);
  return (
    <View
      accessibilityLabel={t('ownerMenu.live.phone')}
      style={[styles.phone, { backgroundColor: theme.bg, borderColor: theme.line }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.cover, { backgroundColor: theme.wash }]}>
          {venue.banner?.url ? (
            <VenueImage url={venue.banner.url} alt={venue.name} style={StyleSheet.absoluteFill} />
          ) : null}
        </View>
        <View style={styles.intro}>
          <View style={[styles.logo, { backgroundColor: theme.fill, borderColor: theme.bg }]}>
            {venue.logo?.url ? (
              <VenueImage url={venue.logo.url} alt={venue.name} style={StyleSheet.absoluteFill} />
            ) : (
              <Text variant="title" style={{ color: theme.onFill }}>
                {venue.initials ?? venue.name.slice(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
          <Text variant="display-m">{venue.name}</Text>
          <Text variant="caption" numberOfLines={2} style={{ color: theme.muted }}>
            {venue.location.label}
          </Text>
        </View>
        <FilterChips
          label={t('ownerMenu.sections')}
          value={chip}
          onChange={setChip}
          gutter={tokens.space[4]}
          items={[
            { id: 'all', label: t('ownerMenu.allSections') },
            ...sections.map((s) => ({ id: s.id, label: s.name.en })),
          ]}
        />
        <View style={styles.body}>
          {shown.map((section) => {
            const inSection = dishes.filter((dish) => dish.categoryId === section.id);
            return (
              <PreviewSection
                key={section.id}
                section={section}
                dishes={inSection}
                currency={venue.currency}
                canReorder={manual}
                onEditDish={actions.onEditDish}
                onAddDish={() => actions.onAddDish(section.id)}
                onEditSection={() => actions.onEditSection(section)}
                onReorder={() => actions.onReorder(section, inSection)}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    width: '100%',
    maxWidth: PHONE_WIDTH,
    height: 760,
    alignSelf: 'center',
    borderWidth: 8,
    borderRadius: 40,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  scroll: { paddingBottom: tokens.space[8] },
  cover: { height: 140, overflow: 'hidden' },
  intro: { paddingHorizontal: tokens.space[4], gap: tokens.space[1], marginTop: -36 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[2],
  },
  body: { padding: tokens.space[4], gap: tokens.space[6] },
});
