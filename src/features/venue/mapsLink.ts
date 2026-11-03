import { Platform } from 'react-native';
import type { VenuePublic } from '@/lib/api/types';

/** The venue's own maps link if it set one; otherwise a search on the phone's usual maps app. */
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
