import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, Globe, ReceiptText, Share2 } from 'lucide-react-native';
import type { VenuePublic } from '@/lib/api/types';
import { env } from '@/lib/env';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { guestFont, useTheme } from '@/ui/theme';
import { VenueImage } from '@/ui/VenueImage';
import { useGuestNotes } from '@/features/notices';
import {
  chooseLanguage,
  languageByCode,
  LanguagePicker,
  shareVenueLink,
  type LanguageCode,
} from '@/features/venue';

export const BANNER = 220;

/**
 * The online page's banner photo with its round buttons: share on the left; My orders, the bell
 * (with how many notifications are new) and language on the right.
 */
export function OnlineBanner({ venue, topInset }: { venue: VenuePublic; topInset: number }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);
  const language = languageByCode(i18n.language);
  const notes = useGuestNotes(venue.slug);
  const top = topInset + tokens.space[3];
  const round = [styles.round, { backgroundColor: theme.white }];

  const share = () => {
    const origin = globalThis.location?.origin;
    const base =
      typeof origin === 'string' && origin.startsWith('http') ? origin : env.EXPO_PUBLIC_SITE_URL;
    void shareVenueLink(`${base}/${venue.slug}`, venue.name).then((result) => {
      if (result === 'copied') setCopied(true);
    });
  };

  return (
    <View style={[styles.banner, { height: BANNER + topInset, backgroundColor: theme.wash }]}>
      <VenueImage
        url={venue.banner.url}
        alt={venue.banner.alt ?? venue.name}
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.share')}
        onPress={share}
        style={[round, styles.left, { top }]}
      >
        <Share2 color={theme.black} size={18} strokeWidth={2} />
      </Pressable>
      <View style={[styles.right, { top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('myOrders.open')}
          onPress={() => router.push(`/${venue.slug}/orders`)}
          style={round}
        >
          <ReceiptText color={theme.black} size={18} strokeWidth={2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('notices.bellA11y', { count: notes.unseen })}
          onPress={() => router.push(`/${venue.slug}/notifications`)}
          style={round}
        >
          <Bell color={theme.black} size={18} strokeWidth={2} />
          {notes.unseen > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.fill, borderColor: theme.white }]}>
              <Text variant="caption" style={[styles.badgeText, { color: theme.onFill }]}>
                {notes.unseen}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.chooseLanguage')}
          onPress={() => setLanguageOpen(true)}
          style={[round, styles.lang]}
        >
          <Globe color={theme.black} size={16} strokeWidth={2} />
          <Text variant="caption" style={[styles.strong, { color: theme.black }]}>
            {language.label}
          </Text>
        </Pressable>
      </View>
      {copied ? (
        <View style={[styles.copied, { top: topInset + 60, backgroundColor: theme.surface }]}>
          <Text variant="caption">{t('home.linkCopied')}</Text>
        </View>
      ) : null}
      <LanguagePicker
        open={languageOpen}
        selected={language.code}
        onChoose={(code: LanguageCode) => {
          void chooseLanguage(code);
        }}
        onClose={() => setLanguageOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { overflow: 'hidden' },
  round: {
    height: 40,
    minWidth: 40,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: { position: 'absolute', zIndex: 2, start: tokens.space[4] },
  right: {
    position: 'absolute',
    zIndex: 2,
    end: tokens.space[4],
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  lang: { flexDirection: 'row', gap: tokens.space[1] + 2, paddingHorizontal: tokens.space[3] },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: tokens.space[1],
    borderRadius: tokens.radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: tokens.type.caption.size - 3,
    lineHeight: 12,
    fontFamily: guestFont.strong,
  },
  copied: {
    position: 'absolute',
    start: tokens.space[4],
    zIndex: 2,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space[2] + 2,
    paddingVertical: tokens.space[1] + 2,
  },
  strong: { fontFamily: guestFont.strong },
});
