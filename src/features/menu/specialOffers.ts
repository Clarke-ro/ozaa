import type { MenuItem, Offer } from '@/lib/api/types';
import { isOnGuestMenu, onSale } from '@/lib/dishRules';

export type SpecialOffer =
  | { kind: 'dish'; item: MenuItem; label: string | null }
  | { kind: 'note'; id: string; title: string; detail: string | null };

/**
 * What the Special offers row shows: the venue's offers running now (from GET …/offers), and
 * every dish the owner has put on sale. An offer for a dish shows that dish, titled with the
 * offer; any other offer is a short note. Hidden or sold-out dishes and ended offers stay out.
 * Empty means no row at all.
 */
export function specialOffers(items: MenuItem[], offers: Offer[], now: number): SpecialOffer[] {
  const orderable = (item: MenuItem | undefined): item is MenuItem =>
    Boolean(item && isOnGuestMenu(item) && item.available);
  const live = offers.filter((offer) => !offer.endsAt || Date.parse(offer.endsAt) > now);
  const byId = new Map(items.map((item) => [item.id, item]));
  const rows: SpecialOffer[] = [];
  const shown = new Set<string>();

  for (const offer of live) {
    if (!offer.menuItemId) {
      rows.push({
        kind: 'note',
        id: offer.id,
        title: offer.title.en ?? '',
        detail: offer.detail?.en ?? null,
      });
      continue;
    }
    const item = byId.get(offer.menuItemId);
    if (!orderable(item) || shown.has(item.id)) continue;
    shown.add(item.id);
    rows.push({ kind: 'dish', item, label: offer.title.en ?? null });
  }
  for (const item of items) {
    if (orderable(item) && onSale(item) && !shown.has(item.id)) {
      shown.add(item.id);
      rows.push({ kind: 'dish', item, label: null });
    }
  }
  // Dishes first: they can go straight into the order.
  return [
    ...rows.filter((row) => row.kind === 'dish'),
    ...rows.filter((row) => row.kind === 'note'),
  ];
}
