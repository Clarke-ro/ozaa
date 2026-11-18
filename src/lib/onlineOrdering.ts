import type { GeoPoint, OnlineFulfilment, OnlineOrdering } from '@/lib/api/types';
import { distanceKm } from '@/lib/geo';

/** The venue's online ordering with every part filled in. Missing means everything is off. */
export function onlineOrderingOf(settings: OnlineOrdering | null | undefined): OnlineOrdering {
  return {
    enabled: settings?.enabled ?? false,
    pickup: settings?.pickup ?? { enabled: false, prepMinutes: 20 },
    delivery: settings?.delivery ?? {
      enabled: false,
      minimumFeePesewas: 0 as OnlineOrdering['delivery']['minimumFeePesewas'],
      feePerKmPesewas: 0 as OnlineOrdering['delivery']['feePerKmPesewas'],
      maxDistanceKm: 5,
      freeOverPesewas: null,
    },
  };
}

export type DeliveryQuote =
  { ok: true; feePesewas: number } | { ok: false; reason: 'off' | 'too_far' | 'bad_distance' };

/**
 * What delivery costs for this distance and food total. The fee is the per-km price (rounded
 * half up to the pesewa, like every other money sum here) but never below the minimum, and it
 * is 0 once the food reaches the free-delivery amount. The server runs this too; its answer wins.
 */
export function deliveryQuote(
  settings: OnlineOrdering,
  distanceKm: number,
  foodPesewas: number,
): DeliveryQuote {
  const delivery = settings.delivery;
  if (!settings.enabled || !delivery.enabled) return { ok: false, reason: 'off' };
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return { ok: false, reason: 'bad_distance' };
  if (distanceKm > delivery.maxDistanceKm) return { ok: false, reason: 'too_far' };
  if (delivery.freeOverPesewas != null && foodPesewas >= delivery.freeOverPesewas)
    return { ok: true, feePesewas: 0 };
  const byDistance = Math.round(distanceKm * delivery.feePerKmPesewas);
  return { ok: true, feePesewas: Math.max(delivery.minimumFeePesewas, byDistance) };
}

export type FulfilmentCheck =
  | { ok: true; source: 'pickup' | 'delivery'; deliveryFeePesewas: number; etaMinutes: number }
  | {
      ok: false;
      code:
        | 'online_ordering_off'
        | 'method_off'
        | 'missing_contact'
        | 'missing_address'
        | 'missing_location'
        | 'no_venue_location'
        | 'too_far';
    };

/**
 * Can this menu-link order be taken, and on what terms? The server's check; the guest app runs
 * it too, to show the fee and any problem before the customer sends the order.
 */
export function checkFulfilment(
  settings: OnlineOrdering,
  venuePin: GeoPoint | null,
  fulfilment: OnlineFulfilment,
  foodPesewas: number,
): FulfilmentCheck {
  if (!settings.enabled) return { ok: false, code: 'online_ordering_off' };
  if (!fulfilment.contact.name.trim() || !fulfilment.contact.phone)
    return { ok: false, code: 'missing_contact' };
  const eta = settings.pickup.prepMinutes;
  if (fulfilment.type === 'pickup') {
    if (!settings.pickup.enabled) return { ok: false, code: 'method_off' };
    return { ok: true, source: 'pickup', deliveryFeePesewas: 0, etaMinutes: eta };
  }
  if (!settings.delivery.enabled) return { ok: false, code: 'method_off' };
  if (!venuePin) return { ok: false, code: 'no_venue_location' };
  if (!fulfilment.address?.trim()) return { ok: false, code: 'missing_address' };
  const pin = fulfilment.location;
  if (!pin || !onEarth(pin)) return { ok: false, code: 'missing_location' };
  const reportedKm = distanceKm(venuePin, pin);
  if (!Number.isFinite(reportedKm)) return { ok: false, code: 'missing_location' };
  // The pin only answers "inside the zone or not". The guest picks it, so a pin dropped on the
  // restaurant with a far typed address would otherwise pay the minimum. The fee is the zone's
  // own far edge, which is the most this venue said it would charge inside that zone.
  if (reportedKm > settings.delivery.maxDistanceKm) return { ok: false, code: 'too_far' };
  const quote = deliveryQuote(settings, settings.delivery.maxDistanceKm, foodPesewas);
  if (!quote.ok) return { ok: false, code: quote.reason === 'too_far' ? 'too_far' : 'method_off' };
  return { ok: true, source: 'delivery', deliveryFeePesewas: quote.feePesewas, etaMinutes: eta };
}

function onEarth(point: GeoPoint): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  );
}
