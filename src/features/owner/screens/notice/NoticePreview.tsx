import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { VenueSettings } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import type { NoticeDraft } from '../../desk/noticeForm';
import { PhoneFrame } from '../menu/live/PhoneFrame';

/**
 * "What guests see" beside the notice (design canvas): a phone with the banner across the top in
 * the venue colour and, when it is on, the popup over a dimmed page. Shows the words being typed,
 * before they are saved.
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
  const { t } = useTranslation();
  const showBanner = banner.enabled && banner.text.trim();
  const showPopup = popup.enabled && popup.text.trim();
  return (
    <View style={styles.wrap}>
      <Text variant="title" accessibilityRole="header">
        {t('ownerNotice.guestsSee')}
      </Text>
      <PhoneFrame label={t('ownerNotice.guestsSee')}>
        <View style={styles.screen}>
          {showBanner ? (
            <View style={[styles.banner, { backgroundColor: theme.fill }]}>
              <Text style={[styles.bannerText, { color: theme.onFill }]} numberOfLines={1}>
                {banner.text}
              </Text>
            </View>
          ) : null}
          <View style={styles.page}>
            <Text style={styles.venue}>{venue.name}</Text>
            <Text style={[styles.small, { color: theme.muted }]}>
              {t('ownerNotice.atYourTable')}
            </Text>
          </View>
          {showPopup ? (
            <View style={[styles.dim, { backgroundColor: theme.scrim }]}>
              <View style={[styles.popup, { backgroundColor: theme.surface }]}>
                {popup.title.trim() ? (
                  <Text style={[styles.kicker, { color: theme.ink }]}>
                    {popup.title.toUpperCase()}
                  </Text>
                ) : null}
                <Text style={styles.popupText}>{popup.text}</Text>
                <View style={[styles.ok, { backgroundColor: theme.fill }]}>
                  <Text style={[styles.okText, { color: theme.onFill }]}>
                    {t('ownerNotice.ok')}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </PhoneFrame>
      <Text style={[styles.caption, { color: theme.meta }]}>{t('ownerNotice.previewNote')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[4] },
  screen: { flex: 1, paddingTop: tokens.space[10] },
  banner: { paddingVertical: 6, paddingHorizontal: tokens.space[3] },
  bannerText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.strong },
  page: { padding: tokens.space[4], gap: 4 },
  venue: { fontSize: 18, lineHeight: 24, fontFamily: fontFamily.strong },
  small: { fontSize: 13, lineHeight: 18 },
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
