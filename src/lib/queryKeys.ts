/**
 * Every guest cache key in one place (owner keys live in features/owner/data/keys.ts).
 * A refresh after a change uses the same factory as the screen that reads the data, so a
 * typo can't leave a screen showing old data. Shorter keys clear the longer ones under them:
 * `guestKeys.loyaltyAll()` refreshes every venue's loyalty card.
 */
export const guestKeys = {
  venue: (slug: string) => ['venue', slug] as const,
  /** The owner menu builder reads and edits this same key. */
  menu: (slug: string) => ['menu', slug] as const,
  offers: (slug: string) => ['offers', slug] as const,
  wifi: (slug: string) => ['wifi', slug] as const,
  order: (orderId: string | null) => ['order', orderId] as const,
  waiterCall: (callId: string) => ['waiter', callId] as const,
  payment: (reference: string | null) => ['payment', reference] as const,
  loyaltyProgram: (slug: string) => ['loyalty-program', slug] as const,
  loyaltyAll: () => ['loyalty'] as const,
  /** Every venue page, e.g. after the owner changes how guests pay. */
  venueAll: () => ['venue'] as const,
  loyaltyVenue: (slug: string) => ['loyalty', slug] as const,
  loyaltyCard: (slug: string, token: string | null | undefined) =>
    ['loyalty', slug, token] as const,
};
