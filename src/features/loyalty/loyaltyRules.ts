/** One stamp per paid order. The game stamp is separate and once per phone per day. */
export function stampsAfterPaidOrder(stamps: number): number {
  return stamps + 1;
}

export function canAwardGameStamp(lastAwardedDay: string | null, today: string): boolean {
  return lastAwardedDay !== today;
}

export function isRewardReady(stamps: number, stampsNeeded: number): boolean {
  return stamps >= stampsNeeded;
}

export function stampsAfterRedeem(stamps: number, stampsNeeded: number): number {
  return stamps - stampsNeeded;
}

/** More circles than this stop fitting on a phone-width card. */
const MAX_SLOTS = 12;
/** The card size for a venue that hasn't set up a reward yet. */
const DEFAULT_SLOTS = 8;

export type StampSlot = { stamped: boolean; reward: boolean };
export type StampCard = { goal: number; counter: string; slots: StampSlot[] };

/**
 * What the stamp card draws. The circles run to the biggest reward, so the card keeps its size
 * as stamps arrive, and a gift marks each reward's circle. The counter points at the next
 * reward still ahead (5 stamps with rewards at 4 and 8 reads "5/8"); once every reward is
 * earned it reads full.
 */
export function stampCard(stamps: number, rewardCosts: readonly number[]): StampCard {
  const costs = [...rewardCosts].filter((cost) => cost > 0).sort((a, b) => a - b);
  const biggest = costs.at(-1) ?? DEFAULT_SLOTS;
  const goal = costs.find((cost) => cost > stamps) ?? biggest;
  const count = Math.min(biggest, MAX_SLOTS);
  const rewardAt = new Set(costs);
  const slots = Array.from({ length: count }, (_, index) => ({
    stamped: index < stamps,
    reward: rewardAt.has(index + 1),
  }));
  return { goal, counter: `${Math.min(stamps, goal)}/${goal}`, slots };
}
