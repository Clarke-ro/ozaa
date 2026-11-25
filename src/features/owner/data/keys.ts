import { guestKeys } from '@/lib/queryKeys';

/**
 * Every owner cache key in one place. A save invalidates the key of what it changed,
 * and any screen showing that data refetches. Keys start with the shared prefix so
 * `invalidateQueries({ queryKey: ownerKeys.venue(id) })` also clears longer keys under it.
 * Every key starts with "owner-": sign-out uses that to drop them all (lib/queryPersist.ts).
 */
export const ownerKeys = {
  business: () => ['owner-business'] as const,
  /** The signed-in person: name, photo and app preferences. */
  me: () => ['owner-me'] as const,
  notifications: (venueId: string) => ['owner-notifications', venueId] as const,
  promos: (venueId: string) => ['owner-promos', venueId] as const,
  scans: (venueId: string) => ['owner-scans', venueId] as const,
  venue: (venueId: string) => ['owner-venue', venueId] as const,
  dashboard: (venueId: string) => ['owner-dashboard', venueId] as const,
  insights: (venueId: string, range?: string) =>
    (range ? ['owner-insights', venueId, range] : ['owner-insights', venueId]) as readonly string[],
  orders: (venueId: string) => ['owner-orders', venueId] as const,
  /** One order. Sits under `orders`, so saving an order refreshes this page too. */
  order: (venueId: string, orderId = '') => ['owner-orders', venueId, orderId] as const,
  /** The new-order chime. Open tickets, then only what changed. Not the history list. */
  liveOrders: (venueId: string) => ['owner-live-orders', venueId] as const,
  floor: (venueId: string) => ['owner-floor', venueId] as const,
  calls: (venueId: string) => ['owner-calls', venueId] as const,
  tables: (venueId: string) => ['owner-tables', venueId] as const,
  feedback: (venueId: string) => ['owner-feedback', venueId] as const,
  links: (venueId: string) => ['owner-links', venueId] as const,
  loyalty: (venueId: string) => ['owner-loyalty', venueId] as const,
  /** Add the search and filter after this to key one search: `[...loyaltyCustomers(id), q]`. */
  loyaltyCustomers: (venueId: string) => ['owner-loyalty-customers', venueId] as const,
  /** Add the range after this: `[...loyaltyAnalytics(id), '30d']`. */
  loyaltyAnalytics: (venueId: string) => ['owner-loyalty-analytics', venueId] as const,
  services: (venueId: string) => ['owner-services', venueId] as const,
  staff: (venueId: string) => ['owner-staff', venueId] as const,
  devices: (venueId: string) => ['owner-devices', venueId] as const,
  reviews: (venueId: string) => ['owner-written', venueId] as const,
  /** Add the range after this: `[...sales(id), '7d']`. */
  sales: (venueId: string) => ['owner-sales', venueId] as const,
  paymentSettings: (venueId: string) => ['owner-payment-settings', venueId] as const,
  channels: (venueId: string) => ['owner-channels', venueId] as const,
  /** The guest menu, keyed by venue slug; the owner menu builder reads and edits the same data. */
  menu: guestKeys.menu,
};
