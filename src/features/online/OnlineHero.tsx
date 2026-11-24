import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import type { VenuePublic } from '@/lib/api/types';
import { onlineOrderingOf } from '@/lib/onlineOrdering';
import { pesewas } from '@/lib/brand';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { hoursBox } from '@/lib/time';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { guestFont, useTheme } from '@/ui/theme';
import { ActiveOrderStrip } from '@/features/history';
import { InfoBoxes, type InfoBox } from '@/features/venue';
import { OnlineBanner } from './OnlineBanner';

// The white sheet rises over the banner's bottom edge by this much.
const LIFT = tokens.radius.lg;

/**
 * The top of the online-ordering page (the venue's own link): the banner with its round buttons,
 * then a white sheet with the venue's name, an "Info ›" link to its details, and boxes for pickup
 * time, delivery and open hours (design canvas, Clarke 2026-11-23). It scrolls away; the menu
 * below is what customers came for.
 */
export function OnlineHero({ venue, topInset }: { venue: VenuePublic; topInset: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const ordering = onlineOrderingOf(venue.onlineOrdering);
  const hours = hoursBox(venue.hours, new Date());

  const boxes: InfoBox[] = [
    ...(ordering.enabled && ordering.pickup.enabled
      ? [
          {
            key: 'pickup',
            title: t('online.minutes', { minutes: ordering.pickup.prepMinutes }),
            detail: t('online.pickupShort'),
          },
        ]
      : []),
    ...(ordering.enabled && ordering.delivery.enabled
      ? [
          {
            key: 'delivery',
            title: t('online.delivery'),
            detail:
              ordering.delivery.minimumFeePesewas > 0
                ? t('online.from', {
                    amount: formatMoney(
                      pesewas(ordering.delivery.minimumFeePesewas),
                      venue.currency ?? DEFAULT_CURRENCY,
                    ),
                  })
                : null,
          },
        ]
      : []),
    { key: 'hours', title: hours.title, detail: hours.detail, good: hours.open },
  ];

  return (
    <View>
      <OnlineBanner venue={venue} topInset={topInset} />

      <View style={[styles.sheet, { backgroundColor: theme.white }]}>
        <View style={styles.titleRow}>
          <Text
            variant="display-m"
            accessibilityRole="header"
            style={styles.name}
            numberOfLines={2}
          >
            {venue.name}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('online.infoLabel', { name: venue.name })}
            onPress={() => router.push(`/${venue.slug}/about`)}
            hitSlop={12}
            style={styles.info}
          >
            <Text variant="body" style={[styles.strong, { color: theme.ink }]}>
              {t('online.info')}
            </Text>
            <ChevronRight size={16} color={theme.ink} strokeWidth={2} />
          </Pressable>
        </View>
        <InfoBoxes items={boxes} />
        <ActiveOrderStrip slug={venue.slug} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strong: { fontFamily: guestFont.strong },
  sheet: {
    marginTop: -LIFT,
    borderTopLeftRadius: LIFT,
    borderTopRightRadius: LIFT,
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: tokens.space[4],
    paddingBottom: tokens.space[4],
    gap: tokens.space[3],
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  name: { flex: 1 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },
});
