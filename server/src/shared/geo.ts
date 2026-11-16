// Generated from src/lib/geo.ts by scripts/sync-server-shared.mjs. Do not edit here.
import type { GeoPoint } from './types.ts';

// Earth's mean radius. Good to well under 1% for the few kilometres a delivery covers.
const EARTH_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Straight-line distance between two points (the haversine formula), in km. Roads are longer,
 * which is why owners set a per-km fee and a furthest distance with some room in them.
 */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
