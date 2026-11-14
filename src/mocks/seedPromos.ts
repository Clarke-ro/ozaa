import type { World } from './worldTypes';

const DAY_MS = 86_400_000;

/**
 * Four promos for Mama's Kitchen, as on the design canvas: two running (a happy hour on drinks and
 * a code), one that starts in two days and one that has ended. States are worked out from these
 * dates each time the list is read, so they stay right as the clock moves. Each needs a code at
 * checkout, so a seeded promo never changes a guest's total on its own.
 */
export function seedPromos(world: World, now: number): void {
  const venueId = world.venues['mamas-kitchen']?.id;
  if (!venueId) return;
  const at = (days: number) => new Date(now + days * DAY_MS).toISOString();
  const base = {
    venueId,
    discountGivenPesewas: 0,
    state: 'off' as const,
    enabled: true,
    days: [] as number[],
  };
  world.promos.push(
    {
      ...base,
      id: 'prm_happy',
      name: 'Happy hour',
      kind: 'percent_off',
      percent: 20,
      appliesTo: 'category',
      categoryId: 'cat_mamas3',
      channel: 'all',
      days: [1, 2, 3, 4, 5],
      startTime: '16:00',
      endTime: '18:00',
      // A code, so guest totals in tests never depend on the time of day.
      code: 'HAPPYHOUR',
      usageCount: 38,
      createdAt: at(-30),
    },
    {
      ...base,
      id: 'prm_friday',
      name: 'FRIDAY10',
      kind: 'percent_off',
      percent: 10,
      appliesTo: 'order',
      minSpendPesewas: 15_000,
      code: 'FRIDAY10',
      channel: 'all',
      usageCount: 12,
      createdAt: at(-20),
    },
    {
      ...base,
      id: 'prm_kelewele',
      name: 'Free kelewele with jollof',
      kind: 'free_item',
      freeItemId: 'itm_mamas3',
      appliesTo: 'order',
      channel: 'table',
      code: 'KELEWELE',
      startsAt: at(2),
      usageCount: 0,
      createdAt: at(-1),
    },
    {
      ...base,
      id: 'prm_independence',
      name: 'INDEPENDENCE',
      kind: 'percent_off',
      percent: 15,
      appliesTo: 'order',
      code: 'INDEPENDENCE',
      channel: 'all',
      startsAt: at(-260),
      endsAt: at(-252),
      enabled: false,
      usageCount: 84,
      createdAt: at(-262),
    },
  );
}
