import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { VenueSettings } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, ThemeProvider, themeFromAccent, useTheme, type FontPair } from '@/ui/theme';
import { languageByCode, VenueHomeBody } from '@/features/venue';
import type { NoticeDraft } from '../../desk/noticeForm';
import { PhoneFrame } from '../menu/live/PhoneFrame';

/**
 * "What guests see" beside the notice (design canvas): the real guest home in a phone, with the
 * banner across the top in the venue colour and, when it is on, the popup over a dimmed page.
 * Shows the words being typed, before they are saved.
 */
export function NoticePreview({
  venue,
  banner,
  popup,
}: {
  venue: VenueSettings;
  banner: NoticeDraft;
  popup: NoticeDraft;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  // The guest page in its own colour and font, always light like a guest's first visit.
  const guest = themeFromAccent(
    venue.theme.accent,
    (venue.theme.fontPair ?? 'cravins') as FontPair,
    'light',
  );
  const showBanner = banner.enabled && banner.text.trim();
  const showPopup = popup.enabled && popup.text.trim();
  return (
    <View style={styles.wrap}>
      <Text variant="title" accessibilityRole="header">
        {t('ownerNotice.guestsSee')}
      </Text>
      <ThemeProvider theme={guest}>
        <PhoneFrame label={t('ownerNotice.guestsSee')}>
          <View style={styles.screen} pointerEvents="none" accessibilityElementsHidden>
            {showBanner ? (
              <View style={[styles.banner, { backgroundColor: guest.fill }]}>
                {/* The banner scrolls on guest pages; here the words repeat to show that. */}
                <Text style={[styles.bannerText, { color: guest.onFill }]} numberOfLines={1}>
                  {`${banner.text.trim()} · ${banner.text.trim()} · ${banner.text.trim()}`}
                </Text>
              </View>
            ) : null}
            <ScrollView style={styles.fill} scrollEnabled={false}>
              <VenueHomeBody
                venue={venue}
                tableCode={null}
                topInset={showBanner ? 0 : tokens.space[8]}
                languageLabel={languageByCode(i18n.language).label}
                onOpen={() => undefined}
              />
            </ScrollView>
            {showPopup ? (
              <View style={[styles.dim, { backgroundColor: guest.scrim }]}>
                <View style={[styles.popup, { backgroundColor: guest.surface }]}>
                  {popup.title.trim() ? (
                    <Text style={[styles.kicker, { color: guest.ink }]}>
                      {popup.title.toUpperCase()}
                    </Text>
                  ) : null}
                  <Text style={[styles.popupText, { fontFamily: guest.displayFont }]}>
                    {popup.text}
                  </Text>
                  <View style={[styles.ok, { backgroundColor: guest.fill }]}>
                    <Text style={[styles.okText, { color: guest.onFill }]}>
                      {t('ownerNotice.ok')}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </PhoneFrame>
      </ThemeProvider>
      <Text style={[styles.caption, { color: theme.meta }]}>{t('ownerNotice.previewNote')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[4] },
  screen: { flex: 1 },
  fill: { flex: 1 },
  // Below the phone's camera island, like the banner on a real guest page.
  banner: { marginTop: 44, paddingVertical: 8, paddingHorizontal: tokens.space[3] },
  bannerText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.strong },
  dim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space[5],
  },
  popup: { alignSelf: 'stretch', borderRadius: 14, padding: tokens.space[4], gap: tokens.space[2] },
  kicker: { fontSize: 11, lineHeight: 14, fontFamily: fontFamily.strong, letterSpacing: 0.8 },
  popupText: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.strong },
  ok: {
    marginTop: tokens.space[2],
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okText: { fontSize: 14, lineHeight: 18, fontFamily: fontFamily.strong },
  caption: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
