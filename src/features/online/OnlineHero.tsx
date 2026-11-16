import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bike, ChevronRight, Clock } from 'lucide-react-native';
import type { VenuePublic } from '@/lib/api/types';
import { onlineOrderingOf } from '@/lib/onlineOrdering';
import { describeHours } from '@/lib/time';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { ActiveOrderStrip } from '@/features/history';
import { OnlineBanner } from './OnlineBanner';

// The white sheet rises over the banner's bottom edge by this much.
const LIFT = tokens.radius.lg;

/**
 * The top of the online-ordering page (the venue's own link): the banner with share and
 * language, then the venue's name with a small "Info" link to its details, and slim pills for
 * open hours, pickup time and delivery. It scrolls away; the menu below is what customers came for.
 */
export function OnlineHero({ venue, topInset }: { venue: VenuePublic; topInset: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const ordering = onlineOrderingOf(venue.onlineOrdering);
  const hours = describeHours(venue.hours, new Date());

  return (
    <View>
      <OnlineBanner venue={venue} topInset={topInset} />

      <View style={[styles.sheet, { backgroundColor: theme.bg }]}>
        <View style={styles.titleRow}>
          <Text variant="title" accessibilityRole="header" style={styles.name} numberOfLines={2}>
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
        <View style={styles.pills}>
          <View
            style={[styles.pill, { backgroundColor: hours.open ? theme.successTint : theme.wash }]}
          >
            <View
              style={[styles.dot, { backgroundColor: hours.open ? theme.success : theme.meta }]}
            />
            <Text
              variant="caption"
              numberOfLines={1}
              style={[styles.strong, { color: hours.open ? theme.success : theme.muted }]}
            >
              {hours.text}
            </Text>
          </View>
          {ordering.enabled && ordering.pickup.enabled ? (
            <View style={[styles.pill, { backgroundColor: theme.wash }]}>
              <Clock size={13} color={theme.muted} strokeWidth={2} />
              <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
                {t('online.pickupIn', { minutes: ordering.pickup.prepMinutes })}
              </Text>
            </View>
          ) : null}
          {ordering.enabled && ordering.delivery.enabled ? (
            <View style={[styles.pill, { backgroundColor: theme.wash }]}>
              <Bike size={13} color={theme.muted} strokeWidth={2} />
              <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
                {t('online.delivery')}
              </Text>
            </View>
          ) : null}
        </View>
        <ActiveOrderStrip slug={venue.slug} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strong: { fontFamily: fontFamily.strong },
  sheet: {
    marginTop: -LIFT,
    borderTopLeftRadius: LIFT,
    borderTopRightRadius: LIFT,
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: tokens.space[4],
    paddingBottom: tokens.space[2],
    gap: tokens.space[2],
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  name: { flex: 1, fontSize: 22, lineHeight: 28 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1] + 2,
    height: 28,
    paddingHorizontal: tokens.space[2] + 2,
    borderRadius: tokens.radius.full,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
