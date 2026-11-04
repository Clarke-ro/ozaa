import * as Location from 'expo-location';
import type { GeoPoint } from '@/lib/api/types';

export type HereResult =
  { ok: true; point: GeoPoint } | { ok: false; reason: 'denied' | 'unavailable' };

/**
 * The phone's position, once, after asking. Only called when someone taps "Use my location".
 * On the web this is the browser's own location prompt. Nothing is kept or sent anywhere except
 * with the order (or the venue pin) the person is saving.
 */
export async function hereOnce(): Promise<HereResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return { ok: false, reason: 'denied' };
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { ok: true, point: { lat: position.coords.latitude, lng: position.coords.longitude } };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
