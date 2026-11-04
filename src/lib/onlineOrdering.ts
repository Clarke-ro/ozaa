import type { OnlineOrdering } from '@/lib/api/types';

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
