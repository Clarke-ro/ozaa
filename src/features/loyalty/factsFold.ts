import {
  DAY,
  type Fact,
  type Programme,
  type RewardOffer,
  type TierId,
  type Wallet,
} from './factsTypes';

/** The balance maths: a card's balance, lifetime and tier are a fold over its facts. */
export function fold(
  programme: Programme,
  facts: readonly Fact[],
  now: string,
): { balance: number; lifetime: number; tier: TierId; live: Wallet['liveClaim'] } {
  const nowMs = Date.parse(now);
  const confirmed = new Set(
    facts
      .filter((fact) => fact.kind === 'confirm')
      .map((fact) => (fact.kind === 'confirm' ? fact.claimId : '')),
  );
  const liveFact = facts.find(
    (fact) =>
      fact.kind === 'claim' && !confirmed.has(fact.id) && Date.parse(fact.expiresAt) > nowMs,
  );
  const live =
    liveFact && liveFact.kind === 'claim'
      ? {
          code: liveFact.code,
          expiresAt: liveFact.expiresAt,
          title: liveFact.title,
          units: liveFact.units,
        }
      : null;
  const earns = facts.filter((fact) => fact.kind === 'earn');
  let lifetime = 0;
  const remaining = earns.map((fact) => {
    lifetime += fact.units;
    return fact.units;
  });
  let spend = facts
    .filter((fact) => fact.kind === 'confirm')
    .reduce((sum, fact) => sum + fact.units, 0);
  if (live) spend += live.units;
  for (let index = 0; index < remaining.length && spend > 0; index += 1) {
    const lot = remaining[index] ?? 0;
    const take = Math.min(lot, spend);
    remaining[index] = lot - take;
    spend -= take;
  }
  let balance = 0;
  earns.forEach((fact, index) => {
    const expired =
      programme.expiryDays != null && nowMs - Date.parse(fact.at) >= programme.expiryDays * DAY;
    if (!expired) balance += remaining[index] ?? 0;
  });
  let tier: TierId = 'bronze';
  for (const band of programme.tiers) {
    if (lifetime >= band.minLifetime) tier = band.id;
  }
  return { balance, lifetime, tier, live };
}

export function featured(programme: Programme): RewardOffer | null {
  return programme.rewards.reduce<RewardOffer | null>(
    (best, reward) => (!best || reward.cost < best.cost ? reward : best),
    null,
  );
}

export function factKey(fact: Fact): string {
  if (fact.kind === 'earn' && fact.source.type === 'paid_visit')
    return `earn:order:${fact.source.orderId}`;
  if (fact.kind === 'earn' && fact.source.type === 'game') return `earn:game:${fact.source.day}`;
  if (fact.kind === 'earn' && fact.source.type === 'birthday')
    return `earn:birthday:${fact.source.year}`;
  if (fact.kind === 'claim') return `claim:${fact.id}`;
  if (fact.kind === 'confirm') return `confirm:${fact.claimId}`;
  return '';
}
