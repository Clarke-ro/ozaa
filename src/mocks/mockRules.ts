import { deriveTheme } from '../features/theming/deriveTheme';
import type { TokenSource } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type {
  OnlineFulfilment,
  Order,
  OrderContact,
  OrderSource,
  VenuePublic,
  VenueTheme,
} from '@/lib/api/types';
import { checkFulfilment, onlineOrderingOf } from '@/lib/onlineOrdering';
import { env } from '@/lib/env';
import { STAFF } from './world';
import type { LiveOrder, World } from './world';

/** Small rules the mock calls share. Pure functions: no state of their own. */

export function etag(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 33) ^ text.charCodeAt(index);
  return `"${(hash >>> 0).toString(16)}"`;
}

export function fresh(world: World, live: LiveOrder, now: number, fast: boolean): Order {
  if (!live.manual && live.order.status !== 'cancelled') {
    const scale = fast ? 10 : 1;
    const elapsed = (now - live.receivedAt) * scale;
    let status: Order['status'] = 'received';
    if (elapsed >= 90_000) status = 'served';
    else if (elapsed >= 60_000) status = 'ready';
    else if (elapsed >= 20_000) status = 'preparing';
    else if (elapsed >= 10_000) status = 'accepted';
    if (status !== live.order.status) {
      live.order = {
        ...live.order,
        status,
        readyAt:
          status === 'ready' || status === 'served'
            ? new Date(now).toISOString()
            : live.order.readyAt,
        updatedAt: new Date(now).toISOString(),
      };
    }
  }
  return live.order;
}

export function sessionOf(world: World, tokens: TokenSource) {
  const token = tokens.guest();
  if (!token) throw new ApiError(401, 'unauthorized', 'Sign in again');
  const session = world.sessions.get(token);
  if (!session) throw new ApiError(401, 'unauthorized', 'Sign in again');
  return session;
}

/** The signed-in staff member's role, for checks the real server makes. */
export function staffRole(world: World, tokens: TokenSource) {
  const row = accessOf(world, tokens);
  return STAFF.find((person) => person.phone === row.phone)?.role;
}

/** Payment settings hold the venue's Paystack keys: only the owner may read or change them. */
export function ownerOnly(world: World, tokens: TokenSource) {
  if (staffRole(world, tokens) !== 'owner') {
    throw new ApiError(403, 'forbidden', 'Only the owner can change payments');
  }
}

export function accessOf(world: World, tokens: TokenSource) {
  const token = tokens.access();
  if (!token) throw new ApiError(401, 'unauthorized', 'Sign in again');
  const row = world.access.get(token);
  if (!row) throw new ApiError(401, 'unauthorized', 'Sign in again');
  return row;
}

export function loyaltyOf(world: World, tokens: TokenSource) {
  const token = tokens.loyalty?.() ?? tokens.access();
  if (!token) throw new ApiError(401, 'unauthorized', 'Sign in again');
  const row = world.access.get(token);
  if (!row) throw new ApiError(401, 'unauthorized', 'Sign in again');
  return row;
}

export function themeOf(accent: string | null, fontPair: VenueTheme['fontPair']): VenueTheme {
  const derived = deriveTheme(accent);
  return {
    accent,
    fontPair,
    derived: {
      fill: derived.fill,
      onAccent: derived.onAccent,
      pressed: derived.pressed,
      ink: derived.ink,
      tint: derived.tint,
      badgeInk: derived.badgeInk,
      notes: derived.notes,
      cravinsDistance: derived.cravinsDistance,
      ratios: {
        buttonText: derived.ratios.buttonText,
        inkOnWhite: derived.ratios.inkOnWhite,
        badge: derived.ratios.badge,
      },
    },
  };
}

export type OrderExtras = {
  source: OrderSource;
  contact?: OrderContact | null;
  deliveryAddress?: string | null;
  deliveryFeePesewas?: number;
  etaMinutes?: number;
};

/** Server rules for a menu-link order; a refusal becomes the same error the real server sends. */
export function linkExtras(
  venue: VenuePublic,
  fulfilment: OnlineFulfilment | undefined,
  foodPesewas: number,
  forceOn = false,
): OrderExtras {
  if (!fulfilment) throw new ApiError(400, 'missing_contact', 'Add your name and phone number');
  const settings = onlineOrderingOf(venue.onlineOrdering);
  const pin =
    venue.location.lat != null && venue.location.lng != null
      ? { lat: venue.location.lat, lng: venue.location.lng }
      : null;
  const check = checkFulfilment(
    // Staff taking a phone order don't need online ordering switched on.
    forceOn
      ? { ...settings, enabled: true, pickup: { ...settings.pickup, enabled: true } }
      : settings,
    pin,
    fulfilment,
    foodPesewas,
  );
  if (!check.ok) {
    throw new ApiError(
      check.code === 'missing_contact' ? 400 : 422,
      check.code,
      'This order cannot be taken',
    );
  }
  return {
    source: check.source,
    contact: { name: fulfilment.contact.name.trim(), phone: fulfilment.contact.phone },
    deliveryAddress: check.source === 'delivery' ? (fulfilment.address?.trim() ?? null) : null,
    deliveryFeePesewas: check.deliveryFeePesewas,
    etaMinutes: check.etaMinutes,
  };
}

/**
 * The mock's stand-in for Paystack's card page, on this app's own address. `back` is where
 * Paystack's callback would send the guest (`{site}/{venueSlug}/pay`, see POST /payments).
 */
export function mockCheckoutUrl(reference: string, slug: string): string {
  const origin = typeof location === 'undefined' ? env.EXPO_PUBLIC_SITE_URL : location.origin;
  const back = encodeURIComponent(`/${slug}/pay`);
  return `${origin}/dev/mock-checkout?ref=${reference}&back=${back}`;
}
