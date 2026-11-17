// Generated from src/lib/guestServices.ts by scripts/sync-server-shared.mjs. Do not edit here.
import type { VenuePublic } from './types.ts';

/** What a venue has actually set up, for the services that need something first. */
export type ServiceSetup = {
  /** A Wi-Fi network name is saved. */
  wifi: boolean;
  /** The loyalty programme is switched on. */
  loyalty: boolean;
  /** There is at least one offer to show. */
  offers: boolean;
};

/**
 * The services guests see on the table home: switched on by the owner AND set up (Clarke,
 * 2026-11-17). A Wi-Fi tile with no network, or a Rewards tile with no programme, would only
 * lead to an empty screen, so they stay hidden until the owner fills them in.
 */
export function guestServices(services: VenuePublic['services'], setup: ServiceSetup): VenuePublic['services'] {
  return services.filter((service) => service.enabled && isSetUp(service.id, setup));
}

function isSetUp(id: string, setup: ServiceSetup): boolean {
  if (id === 'wifi') return setup.wifi;
  if (id === 'loyalty') return setup.loyalty;
  if (id === 'offers') return setup.offers;
  return true;
}
