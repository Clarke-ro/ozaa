import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Globe, Share2, Utensils } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { VenuePublic } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { fontFamily, useTheme } from '@/ui/theme';
import { ServiceGrid } from './ServiceGrid';
import { VenueIntro } from './VenueIntro';

// Banner height below the status bar; the logo hangs half over its bottom edge.
const BANNER = 140;
const LOGO = 64;

/**
 * Everything a guest sees on the venue home, with no data loading of its own: banner, share and
 * language, logo, table pill, name and hours, the service cards and the footer. The guest page
 * and the owner's Branding preview both draw this, so the preview is exactly the guest layout.
 */
export function VenueHomeBody({
  venue,
  tableCode,
  topInset,
  languageLabel,
  onShare,
  onLanguage,
  onOpen,
  bannerNote,
  children,
}: {
  venue: VenuePublic;
  tableCode: string | null;
  topInset: number;
  languageLabel: string;
  onShare?: () => void;
  onLanguage?: () => void;
  onOpen: (serviceId: string) => void;
  /** A small note over the banner, such as "Link copied". */
  bannerNote?: ReactNode;
  /** Anything between the intro and the services, such as the offline note. */
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fab = [styles.fab, { backgroundColor: theme.surface, top: topInset + tokens.space[3] }];
  return (
    <>
      <View style={[styles.banner, { height: BANNER + topInset, backgroundColor: theme.wash }]}>
        <VenueImage
          url={venue.banner.url}
          alt={venue.banner.alt ?? venue.name}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.share')}
          onPress={onShare}
          style={[fab, styles.share]}
        >
          <Share2 color={theme.black} size={18} strokeWidth={2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.chooseLanguage')}
          onPress={onLanguage}
          style={[fab, styles.lang]}
        >
          <Globe color={theme.black} size={16} strokeWidth={2} />
          <Text variant="caption" style={styles.strong}>
            {languageLabel}
          </Text>
        </Pressable>
        {bannerNote}
        <View style={[styles.logo, { borderColor: theme.white, backgroundColor: theme.fill }]}>
          {venue.logo ? (
            <VenueImage
              url={venue.logo.url}
              alt={venue.logo.alt ?? venue.name}
              style={styles.logoImage}
            />
          ) : (
            <Text variant="title" style={{ color: theme.onFill }}>
              {venue.initials ?? venue.name.slice(0, 2).toUpperCase()}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.identity}>
        {tableCode ? (
          <View style={[styles.pill, { borderColor: theme.line, backgroundColor: theme.surface }]}>
            <Utensils color={theme.ink} size={14} strokeWidth={2} />
            <Text variant="caption" style={styles.strong}>
              {t('home.table', { code: tableCode })}
            </Text>
          </View>
        ) : null}
        <VenueIntro venue={venue} />
      </View>
      {children}
      <ServiceGrid slug={venue.slug} services={venue.services} onOpen={onOpen} />
      <View style={styles.powered}>
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('home.powered')}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {},
  fab: {
    position: 'absolute',
    zIndex: 2,
    height: 40,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  share: { start: tokens.space[4], width: 40 },
  lang: {
    end: tokens.space[4],
    flexDirection: 'row',
    gap: tokens.space[1] + 2,
    paddingHorizontal: tokens.space[3],
  },
  strong: { fontFamily: fontFamily.strong },
  logo: {
    position: 'absolute',
    start: tokens.grid.mobile.margin,
    bottom: -LOGO / 2,
    width: LOGO,
    height: LOGO,
    borderRadius: LOGO / 2,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: { width: '100%', height: '100%' },
  identity: {
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: LOGO / 2 + tokens.space[2],
    paddingBottom: tokens.space[2],
  },
  pill: {
    position: 'absolute',
    end: tokens.grid.mobile.margin,
    top: tokens.space[2] + 2,
    height: 30,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    paddingHorizontal: tokens.space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1] + 2,
  },
  powered: { alignItems: 'center', marginTop: tokens.space[6] + 4 },
});
