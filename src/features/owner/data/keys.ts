/**
 * Every owner cache key in one place. A save invalidates the key of what it changed,
 * and any screen showing that data refetches. Keys start with the shared prefix so
 * `invalidateQueries({ queryKey: ownerKeys.venue(id) })` also clears longer keys under it.
 */
export const ownerKeys = {
  business: () => ['owner-business'] as const,
  venue: (venueId: string) => ['owner-venue', venueId] as const,
  dashboard: (venueId: string) => ['owner-dashboard', venueId] as const,
  insights: (venueId: string, range?: string) =>
    (range ? ['owner-insights', venueId, range] : ['owner-insights', venueId]) as readonly string[],
  orders: (venueId: string) => ['owner-orders', venueId] as const,
  floor: (venueId: string) => ['owner-floor', venueId] as const,
  calls: (venueId: string) => ['owner-calls', venueId] as const,
  tables: (venueId: string) => ['owner-tables', venueId] as const,
  feedback: (venueId: string) => ['owner-feedback', venueId] as const,
  links: (venueId: string) => ['owner-links', venueId] as const,
  loyalty: (venueId: string) => ['owner-loyalty', venueId] as const,
  services: (venueId: string) => ['services', venueId] as const,
  /** The guest menu, keyed by venue slug; the owner menu builder reads and edits the same data. */
  menu: (slug: string) => ['menu', slug] as const,
};
