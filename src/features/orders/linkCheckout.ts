import type { GeoPoint, OnlineFulfilment, OnlineOrdering } from '@/lib/api/types';
import { asGhanaPhone, parseGhanaPhone } from '@/lib/phone';
import { checkFulfilment } from '@/lib/onlineOrdering';

/** What a menu-link customer fills in. Lives in the screen only, never in storage (Act 843). */
export type CheckoutDraft = {
  type: 'pickup' | 'delivery';
  name: string;
  phone: string;
  address: string;
  location: GeoPoint | null;
};

type Field = 'name' | 'phone' | 'address' | 'location' | 'too_far' | 'unavailable';
export type CheckoutCheck =
  | { ok: true; fulfilment: OnlineFulfilment; deliveryFeePesewas: number; etaMinutes: number }
  | { ok: false; field: Field };

/**
 * The menu-link checkout: is the form complete, and what will delivery cost? Uses the server's
 * own rule (checkFulfilment), so the fee shown is the fee charged; the server still checks again.
 */
export function checkCheckout(
  draft: CheckoutDraft,
  settings: OnlineOrdering,
  venuePin: GeoPoint | null,
  foodPesewas: number,
): CheckoutCheck {
  const name = draft.name.trim();
  if (!name) return { ok: false, field: 'name' };
  const phone = asGhanaPhone(parseGhanaPhone(draft.phone));
  if (!phone) return { ok: false, field: 'phone' };
  const fulfilment: OnlineFulfilment =
    draft.type === 'pickup'
      ? { type: 'pickup', contact: { name, phone } }
      : {
          type: 'delivery',
          contact: { name, phone },
          address: draft.address.trim(),
          ...(draft.location ? { location: draft.location } : {}),
        };
  const check = checkFulfilment(settings, venuePin, fulfilment, foodPesewas);
  if (check.ok) {
    return {
      ok: true,
      fulfilment,
      deliveryFeePesewas: check.deliveryFeePesewas,
      etaMinutes: check.etaMinutes,
    };
  }
  switch (check.code) {
    case 'missing_address':
      return { ok: false, field: 'address' };
    case 'missing_location':
      return { ok: false, field: 'location' };
    case 'too_far':
      return { ok: false, field: 'too_far' };
    default:
      return { ok: false, field: 'unavailable' };
  }
}
