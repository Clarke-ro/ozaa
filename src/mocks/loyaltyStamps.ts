import { apply, LOYALTY_PROBLEMS, minor, toWire } from '../features/loyalty/facts';
import { fold } from '../features/loyalty/factsWire';
import type { Member } from '../features/loyalty/factsTypes';
import { ApiError } from '@/lib/api/errors';
import type { LoyaltyCard, LoyaltyScanResult } from '@/lib/api/types';
import { nextId } from './world';
import { loyaltyOf } from './loyaltyDesk';
import type { World } from './worldTypes';

// One stamp per guest per hour from a scan, so a double tap or a second scan doesn't add two.
const SCAN_COOLDOWN_MS = 60 * 60_000;

/** Add one stamp for a member, keep the log line, and say what happened. */
export function stampMember(
  world: World,
  venueId: string,
  member: Member,
  by: string,
  now: number,
): LoyaltyScanResult {
  const loyalty = loyaltyOf(world, venueId);
  const nowIso = new Date(now).toISOString();
  const lastEarn = member.facts.filter((fact) => fact.kind === 'earn').at(-1);
  const card = () =>
    toWire(loyaltyOf(world, venueId), { kind: 'member', memberId: member.id }) as LoyaltyCard;
  const balanceNow = () =>
    fold(
      loyaltyOf(world, venueId).programme,
      loyaltyOf(world, venueId).members[member.id]?.facts ?? [],
      nowIso,
    ).balance;
  if (lastEarn && now - Date.parse(lastEarn.at) < SCAN_COOLDOWN_MS) {
    return {
      success: false,
      card: card(),
      customerName: member.firstName ?? 'Guest',
      stamps: balanceNow(),
      cooldownViolated: true,
      cooldownRemainingSeconds: Math.ceil(
        (SCAN_COOLDOWN_MS - (now - Date.parse(lastEarn.at))) / 1000,
      ),
      rewardUnlocked: false,
    };
  }
  const before = balanceNow();
  // A counter stamp is a visit with no Cravins order behind it, so it carries no amount.
  const step = apply(
    loyalty,
    {
      type: 'paid_visit',
      orderId: nextId(world, 'scan'),
      amountMinor: minor(0),
      currency: loyalty.programme.currency,
      paid: true,
      loyaltyPhone: member.phone,
      momoPhone: null,
    },
    nowIso,
  );
  if (!step.ok) {
    const problem = LOYALTY_PROBLEMS[step.error.code];
    throw new ApiError(problem.status, step.error.code, problem.title);
  }
  world.loyalty[venueId] = step.next;
  const stamps = balanceNow();
  const unlocked = loyalty.programme.rewards.some(
    (reward) => before < reward.cost && stamps >= reward.cost,
  );
  world.scanLog.unshift({
    id: nextId(world, 'slg'),
    venueId,
    at: nowIso,
    customerId: member.id,
    customerName: member.firstName ?? 'Guest',
    action: 'stamp',
    stampsAfter: stamps,
    reward: null,
    by,
  });
  return {
    success: true,
    card: card(),
    customerName: member.firstName ?? 'Guest',
    stamps,
    cooldownViolated: false,
    cooldownRemainingSeconds: 0,
    rewardUnlocked: unlocked,
  };
}

/**
 * Give the member the first reward they can afford, straight away at the counter: the same
 * claim-and-confirm a guest's code goes through, done in one step by staff.
 */
export function rewardMember(
  world: World,
  venueId: string,
  member: Member,
  by: string,
  now: number,
  random: () => number,
): LoyaltyScanResult {
  const nowIso = new Date(now).toISOString();
  const loyalty = loyaltyOf(world, venueId);
  const { balance } = fold(loyalty.programme, member.facts, nowIso);
  const reward = loyalty.programme.rewards
    .filter((item) => item.cost <= balance)
    .sort((a, b) => a.cost - b.cost)[0];
  if (!reward) throw new ApiError(409, 'cannot_afford', LOYALTY_PROBLEMS.cannot_afford.title);
  const fail = (code: keyof typeof LOYALTY_PROBLEMS) => {
    throw new ApiError(LOYALTY_PROBLEMS[code].status, code, LOYALTY_PROBLEMS[code].title);
  };
  const opened = apply(
    loyalty,
    { type: 'open_claim', phone: member.phone, rewardId: reward.id, random },
    nowIso,
  );
  if (!opened.ok) return fail(opened.error.code);
  const claim = opened.next.members[member.id]?.facts.findLast((fact) => fact.kind === 'claim');
  if (!claim || claim.kind !== 'claim') return fail('claim_unknown');
  const confirmed = apply(opened.next, { type: 'confirm', code: claim.code }, nowIso);
  if (!confirmed.ok) return fail(confirmed.error.code);
  world.loyalty[venueId] = confirmed.next;
  const after = confirmed.next.members[member.id];
  const stamps = after ? fold(confirmed.next.programme, after.facts, nowIso).balance : 0;
  world.scanLog.unshift({
    id: nextId(world, 'slg'),
    venueId,
    at: nowIso,
    customerId: member.id,
    customerName: member.firstName ?? 'Guest',
    action: 'reward',
    stampsAfter: stamps,
    reward: reward.title,
    by,
  });
  return {
    success: true,
    card: toWire(confirmed.next, { kind: 'member', memberId: member.id }) as LoyaltyCard,
    customerName: member.firstName ?? 'Guest',
    stamps,
    cooldownViolated: false,
    cooldownRemainingSeconds: 0,
    rewardUnlocked: false,
    message: reward.title,
  };
}
