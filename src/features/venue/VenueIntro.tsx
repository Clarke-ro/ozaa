import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, MapPin } from 'lucide-react-native';
import type { VenuePublic } from '@/lib/api/types';
import { describeHours } from '@/lib/time';
import { Text } from '@/ui/Text';
import { tokens } from '@/theme/tokens';
import { fontFamily, useTheme } from '@/ui/theme';

// Two lines is enough to set the scene; the rest is one tap away, so the services stay above the fold.
const DESCRIPTION_LINES = 2;

export function mapsLink(location: VenuePublic['location']): string {
  if (location.mapsUrl) return location.mapsUrl;
  const query =
    location.lat != null && location.lng != null
      ? `${location.lat},${location.lng}`
      : location.label;
  return Platform.OS === 'ios'
    ? `https://maps.apple.com/?q=${encodeURIComponent(query)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Venue name, a short description, then opening hours and location on one line. */
export function VenueIntro({ venue }: { venue: VenuePublic }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const hours = describeHours(venue.hours, new Date());
  const [state, ...rest] = hours.text.split(' · ');
  const description = venue.description.en?.trim();

  return (
    <View style={styles.wrap}>
      <Text variant="display-m" accessibilityRole="header" numberOfLines={2}>
        {venue.name}
      </Text>
      {venue.tagline ? (
        <Text variant="body-strong" style={[styles.small, { color: theme.ink }]} numberOfLines={1}>
          {venue.tagline}
        </Text>
      ) : null}
      {description ? (
        <Pressable
          accessibilityRole={clamped ? 'button' : 'text'}
          accessibilityHint={clamped && !expanded ? t('home.moreHint') : undefined}
          disabled={!clamped}
          onPress={() => setExpanded((open) => !open)}
        >
          <Text
            variant="caption"
            style={[styles.description, { color: theme.muted }]}
            numberOfLines={expanded ? undefined : DESCRIPTION_LINES}
            onTextLayout={(e) => {
              if (!expanded && e.nativeEvent.lines.length > DESCRIPTION_LINES) setClamped(true);
            }}
          >
            {description}
          </Text>
          {clamped ? (
            <Text variant="caption" style={[styles.more, { color: theme.ink }]}>
              {expanded ? t('home.less') : t('home.more')}
            </Text>
          ) : null}
        </Pressable>
      ) : null}
      {/* Hours and place share one line so the services stay above the fold. */}
      <View style={styles.meta}>
        <View style={styles.hours} accessible accessibilityLabel={hours.text}>
          <View
            style={[styles.dot, { backgroundColor: hours.open ? theme.success : theme.meta }]}
          />
          <Text variant="caption" numberOfLines={1}>
            <Text
              variant="caption"
              style={{
                color: hours.open ? theme.success : theme.muted,
                fontFamily: fontFamily.strong,
              }}
            >
              {state}
            </Text>
            <Text variant="caption" style={{ color: theme.muted }}>
              {rest.length ? ` · ${rest.join(' · ')}` : ''}
            </Text>
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('home.directions', { place: venue.location.label })}
          onPress={() => void Linking.openURL(mapsLink(venue.location))}
          hitSlop={tokens.space[2]}
          style={({ pressed }) => [styles.place, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MapPin size={14} color={theme.muted} />
          <Text
            variant="caption"
            numberOfLines={1}
            style={[styles.placeText, { color: theme.muted }]}
          >
            {venue.location.label}
          </Text>
          <ChevronRight size={14} color={theme.meta} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[1] },
  small: { fontSize: tokens.type.caption.size + 1, lineHeight: tokens.type.caption.line + 2 },
  description: {
    fontSize: tokens.type.caption.size + 1,
    lineHeight: tokens.type.caption.line + 2,
  },
  more: { fontFamily: fontFamily.strong, marginTop: 2 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    marginTop: tokens.space[1],
  },
  hours: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] + 2, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
    flexShrink: 1,
    minHeight: 32,
  },
  placeText: { flexShrink: 1 },
});
