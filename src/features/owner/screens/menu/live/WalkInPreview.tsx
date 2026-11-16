import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { MenuCategory, MenuItem, VenueSettings } from '@/lib/api/types';
import { languageByCode, VenueHomeBody } from '@/features/venue';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { ThemeProvider } from '@/ui/theme';
import { ownerKeys } from '../../../data/keys';
import { guestTheme, PhonePreview, type PreviewActions } from './PhonePreview';
import { PhoneFrame } from './PhoneFrame';

/**
 * What a walk-in guest sees after scanning a table's QR code: the venue's table page with every
 * service it has switched on (menu, call a waiter, Wi-Fi, pay, the game, loyalty). It is the
 * same layout guests get. Tapping Menu opens the dine-in menu, editable like the online preview;
 * the other buttons do nothing here.
 */
export function WalkInPreview({
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
  const { t, i18n } = useTranslation();
  const [screen, setScreen] = useState<'home' | 'menu'>('home');
  // A real table of this venue, so the page shows its table pill as guests see it.
  const tables = useQuery({
    queryKey: ownerKeys.tables(venue.id),
    queryFn: () => api.ownerListTables(venue.id),
  });
  const tableCode = tables.data?.items[0]?.code ?? null;

  if (screen === 'menu') {
    return (
      <View style={styles.stack}>
        <View style={styles.back}>
          <Button
            label={t('ownerMenu.live.backToTable')}
            tone="ghost"
            size="md"
            onPress={() => setScreen('home')}
          />
        </View>
        <PhonePreview
          variant="table"
          venue={venue}
          sections={sections}
          dishes={dishes}
          actions={actions}
        />
      </View>
    );
  }

  return (
    <ThemeProvider theme={guestTheme(venue)}>
      <PhoneFrame label={t('ownerMenu.live.walkInPhone')}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <VenueHomeBody
            venue={venue}
            tableCode={tableCode}
            topInset={tokens.space[2]}
            languageLabel={languageByCode(i18n.language).label}
            onOpen={(id) => {
              if (id === 'menu') setScreen('menu');
            }}
          />
        </ScrollView>
      </PhoneFrame>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[2] },
  back: { alignItems: 'center' },
  scroll: { paddingBottom: tokens.space[8] },
});
