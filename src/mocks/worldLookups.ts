import { guestServices, type ServiceSetup } from '@/lib/guestServices';
import { apply, blankVenue, featured, LOYALTY_PROBLEMS } from '../features/loyalty/facts';
import type { Command, VenueLoyalty } from '../features/loyalty/facts';
import { ApiError } from '@/lib/api/errors';
import { liveNotices } from '@/lib/notices';
import { guestPayMethods } from '@/lib/payments';
import type { PaymentSettings, ServiceSettings, StoreNotices, VenuePublic } from '@/lib/api/types';
import type { LiveOrder, World } from './worldTypes';

/** Finding things in the world, with the same errors the real server sends. */

export function keepLoyalty(
  world: World,
  venueId: string,
  command: Command,
  nowIso: string,
): { venue: VenueLoyalty; effect: 'posted' | 'duplicate' | 'skipped'; memberId: string | null } {
  const place = venueById(world, venueId);
  const current = world.loyalty[venueId] ?? blankVenue(venueId, place.currency);
  const step = apply(current, command, nowIso);
  if (!step.ok) {
    const problem = LOYALTY_PROBLEMS[step.error.code];
    throw new ApiError(problem.status, step.error.code, problem.title);
  }
  world.loyalty[venueId] = step.next;
  if (command.type === 'save_programme') {
    const best = featured(step.next.programme);
    world.venues[place.slug] = {
      ...place,
      loyaltySummary:
        step.next.programme.enabled && best
          ? { stampsNeeded: best.cost, rewardTitle: best.title }
          : null,
    };
  }
  return { venue: step.next, effect: step.effect, memberId: step.memberId };
}

export function venueBySlug(world: World, slug: string): VenuePublic {
  const venue = world.venues[slug];
  if (!venue || ['owner', 'api', 'legal', 'help'].includes(slug)) {
    throw new ApiError(404, 'venue_not_found', 'Venue not found');
  }
  return venue;
}

export function venueById(world: World, venueId: string): VenuePublic {
  const venue = Object.values(world.venues).find((item) => item.id === venueId);
  if (!venue) throw new ApiError(404, 'venue_not_found', 'Venue not found');
  return venue;
}

/** A new venue takes cash and nothing else until the owner sets up more. */
export function defaultPaymentSettings(): PaymentSettings {
  return {
    paystack: null,
    manual: {
      cash: true,
      cardMachine: false,
      bankTransfer: { enabled: false },
      momo: { enabled: false },
    },
  };
}

export function publicVenue(
  venue: VenuePublic,
  notices: StoreNotices | undefined,
  now: number,
  payment: PaymentSettings = defaultPaymentSettings(),
  setup: ServiceSetup = { wifi: true, loyalty: true, offers: true },
): VenuePublic {
  return {
    ...venue,
    // Switched on and set up (src/lib/guestServices.ts), the same rule as the server.
    services: guestServices(venue.services, setup),
    // Like the server: guests get only what should show right now.
    notices: liveNotices(notices, now),
    // Guests learn how they can pay; never a key.
    payMethods: guestPayMethods(payment),
    payEnabled: payment.paystack !== null,
  };
}

export function nextId(world: World, prefix: string): string {
  world.seq += 1;
  return `${prefix}_${world.seq}`;
}

export function findOrder(world: World, orderId: string): LiveOrder {
  const live = world.orders.find((item) => item.order.id === orderId);
  if (!live) throw new ApiError(404, 'order_not_found', 'Order not found');
  return live;
}

export function serviceSettings(venue: VenuePublic): ServiceSettings {
  return { services: venue.services, game: venue.game ?? { enabled: false, minScore: 15 } };
}

/** What a venue has set up in the demo, for which services guests see. */
export function setupOf(world: World, venue: VenuePublic): ServiceSetup {
  return {
    wifi: Boolean(world.wifi[venue.slug]?.ssid),
    loyalty: world.loyalty[venue.id]?.programme.enabled ?? false,
    offers: (world.offers[venue.slug] ?? []).length > 0,
  };
}
