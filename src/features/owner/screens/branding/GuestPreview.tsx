import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { VenuePublic } from '@/lib/api/types';
import { languageByCode, VenueHomeBody } from '@/features/venue';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { ThemeProvider, themeFromAccent, useTheme, type FontPair } from '@/ui/theme';
import { PhoneFrame } from '../menu/live/PhoneFrame';

/**
 * "What guests see": the real guest home (VenueHomeBody) in a phone, drawn with the owner's
 * unsaved changes. Taps do nothing here; it is a picture of the guest page.
 */
export function GuestPreview({
  venue,
  accent,
  font,
  dark,
}: {
  /** The venue with the draft changes already applied. */
  venue: VenuePublic;
  accent: string | null;
  font: FontPair;
  /** Guest pages set to Dark. "Follow phone" previews as light, the more common phone setting. */
  dark: boolean;
}) {
  const owner = useTheme();
  const { t, i18n } = useTranslation();
  const guest = themeFromAccent(accent, font, dark ? 'dark' : 'light');
  return (
    <View style={styles.wrap}>
      <Text variant="title" accessibilityRole="header">
        {t('ownerBranding.guestsSee')}
      </Text>
      <ThemeProvider theme={guest}>
        <PhoneFrame label={t('ownerBranding.preview')}>
          <View style={styles.fill} pointerEvents="none" accessibilityElementsHidden>
            <ScrollView style={styles.fill} scrollEnabled={false}>
              <VenueHomeBody
                venue={venue}
                tableCode={null}
                topInset={tokens.space[2]}
                languageLabel={languageByCode(i18n.language).label}
                onOpen={() => undefined}
              />
            </ScrollView>
          </View>
        </PhoneFrame>
      </ThemeProvider>
      <Text variant="caption" style={[styles.note, { color: owner.meta }]}>
        {t('ownerBranding.previewNote')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[4] },
  fill: { flex: 1 },
  note: { textAlign: 'center' },
});
