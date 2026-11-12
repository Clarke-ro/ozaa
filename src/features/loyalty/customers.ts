import type { CustomerTag, LoyaltyCustomerSummary } from '@/lib/api/types';
import { DAY, type Member, type Programme } from './factsTypes';
import { fold, maskPhone } from './factsWire';

const QUIET_DAYS = 30;
const NEW_DAYS = 30;
const REGULAR_VISITS = 5;

/**
 * Tags worked out from what a member did, never typed in. New: first visit in the last 30 days.
 * Regular: 5 or more visits. Quiet: no visit for 30 days. Reward ready: a reward to claim.
 */
export function customerTags(
  input: {
    visitCount: number;
    firstVisitAt: string | null;
    lastVisitAt: string | null;
    rewardReady: boolean;
  },
  now: number,
): CustomerTag[] {
  const tags: CustomerTag[] = [];
  if (input.firstVisitAt && now - Date.parse(input.firstVisitAt) < NEW_DAYS * DAY) tags.push('new');
  if (input.visitCount >= REGULAR_VISITS) tags.push('regular');
  if (input.lastVisitAt && now - Date.parse(input.lastVisitAt) >= QUIET_DAYS * DAY)
    tags.push('quiet');
  if (input.rewardReady) tags.push('reward_ready');
  return tags;
}

/** One member as the Customers list shows them, from their own facts on the card. */
export function customerSummary(
  programme: Programme,
  member: Member,
  now: number,
): LoyaltyCustomerSummary {
  const nowIso = new Date(now).toISOString();
  const { balance } = fold(programme, member.facts, nowIso);
  const visits = member.facts.filter(
    (fact) => fact.kind === 'earn' && fact.source.type === 'paid_visit',
  );
  const spent = visits.reduce(
    (sum, fact) =>
      sum +
      (fact.kind === 'earn' && fact.source.type === 'paid_visit' ? fact.source.amountMinor : 0),
    0,
  );
  const earns = member.facts.filter((fact) => fact.kind === 'earn');
  const rewardsAvailable = programme.rewards.filter((reward) => reward.cost <= balance).length;
  const firstVisitAt = visits[0]?.at ?? null;
  const lastVisitAt = visits.at(-1)?.at ?? null;
  return {
    id: member.id,
    name: member.firstName ?? 'Guest',
    phoneMasked: maskPhone(member.phone),
    email: null,
    stamps: balance,
    rewardsAvailable,
    wantsOffers: member.consent.marketing,
    lastStampAt: earns.at(-1)?.at ?? member.consent.at,
    visitCount: visits.length,
    firstVisitAt,
    lastVisitAt,
    spentPesewas: spent,
    tags: customerTags(
      { visitCount: visits.length, firstVisitAt, lastVisitAt, rewardReady: rewardsAvailable > 0 },
      now,
    ),
  };
}
