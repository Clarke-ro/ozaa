import type { OnlineOrdering } from '@/lib/api/types';
import { parseMoneyInput } from '@/lib/money';
import { onlineOrderingOf } from '@/lib/onlineOrdering';

/** What the owner types on the Online ordering page. Money in cedis, distance in km, all text. */
export type OrderingDraft = {
  enabled: boolean;
  pickupOn: boolean;
  prepMinutes: string;
  deliveryOn: boolean;
  minimumFee: string;
  perKm: string;
  maxKm: string;
  freeOver: string;
};

type Field = 'method' | 'prep' | 'minimumFee' | 'perKm' | 'maxKm' | 'freeOver';
export type OrderingCheck = { ok: true; settings: OnlineOrdering } | { ok: false; field: Field };

// The contract's limits.
const PREP_MAX = 240;
const KM_MIN = 0.5;
const KM_MAX = 50;

const cedis = (pesewas: number) => (pesewas / 100).toFixed(2);

export function orderingDraftOf(saved: OnlineOrdering | null | undefined): OrderingDraft {
  const s = onlineOrderingOf(saved);
  return {
    enabled: s.enabled,
    pickupOn: s.pickup.enabled,
    prepMinutes: String(s.pickup.prepMinutes),
    deliveryOn: s.delivery.enabled,
    minimumFee: saved ? cedis(s.delivery.minimumFeePesewas) : '',
    perKm: saved ? cedis(s.delivery.feePerKmPesewas) : '',
    maxKm: saved ? String(s.delivery.maxDistanceKm) : '',
    freeOver: s.delivery.freeOverPesewas == null ? '' : cedis(s.delivery.freeOverPesewas),
  };
}

/** A cedi amount of 0 or more ("0" is allowed: free delivery at any distance). */
function money(text: string): number | null {
  if (text.trim() === '0') return 0;
  const value = parseMoneyInput(text);
  return value === null || value < 0 ? null : value;
}

/** Checks the form and turns it into what we save. Delivery fields only matter with delivery on. */
export function checkOrdering(draft: OrderingDraft): OrderingCheck {
  if (draft.enabled && !draft.pickupOn && !draft.deliveryOn) return { ok: false, field: 'method' };
  const prep = /^\d+$/.test(draft.prepMinutes.trim()) ? Number(draft.prepMinutes) : NaN;
  if (draft.pickupOn && !(prep >= 0 && prep <= PREP_MAX)) return { ok: false, field: 'prep' };

  let delivery = onlineOrderingOf(undefined).delivery;
  if (draft.deliveryOn) {
    const minimumFeePesewas = money(draft.minimumFee);
    if (minimumFeePesewas === null) return { ok: false, field: 'minimumFee' };
    const feePerKmPesewas = money(draft.perKm);
    if (feePerKmPesewas === null) return { ok: false, field: 'perKm' };
    const maxDistanceKm = Number(draft.maxKm.trim().replace(',', '.'));
    if (!draft.maxKm.trim() || !(maxDistanceKm >= KM_MIN && maxDistanceKm <= KM_MAX))
      return { ok: false, field: 'maxKm' };
    let freeOverPesewas: number | null = null;
    if (draft.freeOver.trim()) {
      freeOverPesewas = money(draft.freeOver);
      if (freeOverPesewas === null) return { ok: false, field: 'freeOver' };
    }
    delivery = {
      enabled: true,
      minimumFeePesewas: minimumFeePesewas as OnlineOrdering['delivery']['minimumFeePesewas'],
      feePerKmPesewas: feePerKmPesewas as OnlineOrdering['delivery']['feePerKmPesewas'],
      maxDistanceKm,
      freeOverPesewas: freeOverPesewas as OnlineOrdering['delivery']['freeOverPesewas'],
    };
  }
  return {
    ok: true,
    settings: {
      enabled: draft.enabled,
      pickup: { enabled: draft.pickupOn, prepMinutes: Number.isNaN(prep) ? 20 : prep },
      delivery,
    },
  };
}
