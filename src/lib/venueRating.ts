import type { VenuePublic } from '@/lib/api/types';

/**
 * A venue's rating from its written reviews' stars, the same rule as the server (venueData.ts):
 * every review counts, the private 1 to 3 stars too, shown to one decimal. None yet is no rating.
 */
export function ratingOf(stars: readonly number[]): NonNullable<VenuePublic['rating']> | null {
  if (stars.length === 0) return null;
  const average = stars.reduce((sum, n) => sum + n, 0) / stars.length;
  return { average: Math.round(average * 10) / 10, count: stars.length };
}
