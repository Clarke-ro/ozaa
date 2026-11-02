import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Clock, MapPin } from 'lucide-react-native';
import type { VenuePublic } from '@/lib/api/types';
import { describeHours } from '@/lib/time';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

// Two lines is enough to set the scene; the rest is one tap away, so the services stay above the fold.
const DESCRIPTION_LINES = 2;

function mapsLink(location: VenuePublic['location']): string {
  if (location.mapsUrl) return location.mapsUrl;
  const query =
    location.lat != null && location.lng != null
      ? `${location.lat},${location.lng}`
      : location.label;
  return Platform.OS === 'ios'
    ? `https://maps.apple.com/?q=${encodeURIComponent(query)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Venue name, a short description, and opening hours and location as two small chips. */
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
      <View style={styles.chips}>
        <View
          style={[styles.chip, { backgroundColor: hours.open ? theme.successTint : theme.wash }]}
          accessible
          accessibilityLabel={hours.text}
        >
          <Clock size={14} color={hours.open ? theme.success : theme.muted} />
          <Text variant="caption" numberOfLines={1} style={styles.chipText}>
            <Text
              variant="caption"
              style={{ color: hours.open ? theme.success : theme.muted, fontFamily: 'Inter_600' }}
            >
              {state}
            </Text>
            {rest.length ? ` · ${rest.join(' · ')}` : ''}
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('home.directions', { place: venue.location.label })}
          onPress={() => void Linking.openURL(mapsLink(venue.location))}
          hitSlop={6}
          style={({ pressed }) => [
            styles.chip,
            styles.place,
            { backgroundColor: pressed ? theme.line : theme.wash },
          ]}
        >
          <MapPin size={14} color={theme.muted} />
          <Text variant="caption" numberOfLines={1} style={[styles.chipText, styles.placeText]}>
            {venue.location.label}
          </Text>
          <ChevronRight size={14} color={theme.meta} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  small: { fontSize: 14, lineHeight: 20 },
  description: { fontSize: 14, lineHeight: 20 },
  more: { fontFamily: 'Inter_600', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipText: { flexShrink: 1 },
  place: { flexShrink: 1, maxWidth: '100%' },
  placeText: { maxWidth: 220 },
});
