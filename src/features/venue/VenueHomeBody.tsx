import type { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Bell, Globe, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { VenuePublic } from '@/lib/api/types';
import { hoursBox } from '@/lib/time';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { guestFont, useTheme } from '@/ui/theme';
import { canPayOnline } from '@/lib/payments';
import { InfoBoxes, type InfoBox } from './InfoBoxes';
import { ServiceGrid } from './ServiceGrid';

// Banner height below the status bar: 140 plus about 0.25 cm (Clarke, 2026-11-23).
export const BANNER = 150;
// How far the white sheet rides up over the banner, under its rounded corners.
const OVERLAP = 24;
const LOGO = 44;
const BELL = 40;

/**
 * Everything a guest sees on the venue home, with no data loading of its own: the banner with
 * share and language, then a white sheet with the logo, name, bell and info boxes, a thin grey
 * gap, the service cards and the footer. The guest page and the owner's previews all draw this,
 * so a preview is exactly the guest layout.
 *
 * `scrollY` is the page's scroll offset. The banner moves down by exactly that much, so it stays
 * still while the sheet scrolls up over it. Previews don't scroll and leave it out.
 */
export function VenueHomeBody({
  venue,
  tableCode,
  topInset,
  languageLabel,
  onShare,
  onLanguage,
  onNotices,
  notices = 0,
  onOpen,
  bannerNote,
  scrollY,
  now = new Date(),
  children,
}: {
  venue: VenuePublic;
  tableCode: string | null;
  topInset: number;
  languageLabel: string;
  onShare?: () => void;
  onLanguage?: () => void;
  /** Opens the guest's notifications; the bell shows `notices` new ones. */
  onNotices?: () => void;
  notices?: number;
  onOpen: (serviceId: string) => void;
  /** A small note over the banner, such as "Link copied". */
  bannerNote?: ReactNode;
  scrollY?: Animated.Value;
  now?: Date;
  /** Anything between the info boxes and the services, such as the offline note. */
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fab = [styles.fab, { backgroundColor: theme.surface, top: topInset + tokens.space[3] }];
  const hours = hoursBox(venue.hours, now);
  const boxes: InfoBox[] = [
    ...ratingBox(venue, t),
    ...(tableCode ? [{ key: 'table', title: tableCode, detail: t('home.yourTable') }] : []),
    { key: 'hours', title: hours.title, detail: hours.detail, good: hours.open },
  ];
  return (
    <>
      <Animated.View
        style={[
          { height: BANNER + topInset, backgroundColor: theme.wash },
          scrollY ? { transform: [{ translateY: scrollY }] } : null,
        ]}
      >
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
      </Animated.View>

      <View style={[styles.sheet, { backgroundColor: theme.white }]}>
        <View style={styles.header}>
          <View style={styles.identity}>
            <View style={[styles.logo, { backgroundColor: theme.fill }]}>
              {venue.logo ? (
                <VenueImage
                  url={venue.logo.url}
                  alt={venue.logo.alt ?? venue.name}
                  style={styles.logoImage}
                />
              ) : (
                <Text variant="body-strong" style={{ color: theme.onFill }}>
                  {venue.initials ?? venue.name.slice(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.names}>
              <Text variant="display-m" accessibilityRole="header" numberOfLines={2}>
                {venue.name}
              </Text>
              {venue.location.label ? (
                <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
                  {venue.location.label}
                </Text>
              ) : null}
            </View>
            {onNotices ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('notices.bellA11y', { count: notices })}
                onPress={onNotices}
                style={({ pressed }) => [
                  styles.bell,
                  { backgroundColor: pressed ? theme.line : theme.wash },
                ]}
              >
                <Bell color={theme.black} size={18} strokeWidth={2} />
                {notices > 0 ? (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.fill, borderColor: theme.white },
                    ]}
                  >
                    <Text variant="caption" style={[styles.badgeText, { color: theme.onFill }]}>
                      {notices > 9 ? '9+' : notices}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ) : null}
          </View>
          <InfoBoxes items={boxes} />
        </View>
        {/* The thin grey gap between the header and the services (design canvas). */}
        <View style={[styles.gap, { backgroundColor: theme.bg }]} />
        {children}
        <ServiceGrid
          slug={venue.slug}
          services={venue.services}
          payOnline={canPayOnline(venue)}
          sectionOrder={venue.sectionOrder}
          onOpen={onOpen}
        />
        <View style={styles.powered}>
          <Text variant="caption" style={{ color: theme.meta }}>
            {t('home.powered')}
          </Text>
        </View>
      </View>
    </>
  );
}

/** The venue's rating as an info box, or nothing before its first review. */
export function ratingBox(
  venue: Pick<VenuePublic, 'rating'>,
  t: (key: string, options?: Record<string, unknown>) => string,
): InfoBox[] {
  if (!venue.rating) return [];
  return [
    {
      key: 'rating',
      title: venue.rating.average.toFixed(1),
      detail: t('home.ratings', { count: venue.rating.count }),
      star: true,
    },
  ];
}

const styles = StyleSheet.create({
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
  strong: { fontFamily: guestFont.strong },
  sheet: {
    flexGrow: 1,
    marginTop: -OVERLAP,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    borderCurve: 'continuous',
    // Room under the last card for anything pinned to the bottom of the screen.
    paddingBottom: 96,
  },
  header: {
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: tokens.space[5],
    paddingBottom: tokens.space[4] + 2,
    gap: tokens.space[4],
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  logo: {
    width: LOGO,
    height: LOGO,
    borderRadius: LOGO / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: { width: '100%', height: '100%' },
  names: { flex: 1, minWidth: 0 },
  bell: {
    width: BELL,
    height: BELL,
    borderRadius: BELL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
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
  gap: { height: tokens.space[2] },
  powered: { alignItems: 'center', marginTop: tokens.space[6] + 4 },
});
