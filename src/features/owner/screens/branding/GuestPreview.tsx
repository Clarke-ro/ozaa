import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { VenuePublic } from '@/lib/api/types';
import { languageByCode, VenueHomeBody } from '@/features/venue';
import { tokens } from '@/theme/tokens';
import { ThemeProvider, themeFromAccent, type FontPair } from '@/ui/theme';

// A phone-shaped window, so the owner sees the page at the size guests do.
const PHONE_HEIGHT = 640;

/**
 * The real guest home (VenueHomeBody), drawn with the owner's unsaved changes: name, words,
 * colour, heading font and banner. Taps do nothing here; it is a picture of the guest page.
 */
export function GuestPreview({
  venue,
  accent,
  font,
}: {
  /** The venue with the draft changes already applied. */
  venue: VenuePublic;
  accent: string | null;
  font: FontPair;
}) {
  const { i18n } = useTranslation();
  // Guest pages are always light, on their own white background (not the owner's grey).
  const guest = themeFromAccent(accent, font, 'light');
  return (
    <View
      style={[styles.phone, { backgroundColor: guest.bg }]}
      pointerEvents="none"
      accessibilityElementsHidden
    >
      <ThemeProvider theme={guest}>
        <ScrollView style={styles.screen} scrollEnabled={false}>
          <VenueHomeBody
            venue={venue}
            tableCode={null}
            topInset={tokens.space[2]}
            languageLabel={languageByCode(i18n.language).label}
            onOpen={() => undefined}
          />
        </ScrollView>
      </ThemeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    height: PHONE_HEIGHT,
    overflow: 'hidden',
    borderRadius: tokens.radius.xl,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  screen: { flex: 1 },
});
