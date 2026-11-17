// Generated from src/features/loyalty/factsParse.ts by scripts/sync-server-shared.mjs. Do not edit here.
import {
  currencyCode,
  draw,
  isRecord,
  TIER_IDS,
  type EarnMode,
  type LoyaltyErrorCode,
  type Programme,
  type RewardOffer,
  type TierBand,
  type TierId,
} from './factsTypes.ts';

/** Reading a loyalty programme from outside: what the owner saves, and what the server sends. */
export function parseProgramme(
  input: unknown,
  venueCurrency: string,
  random: () => number,
  previous: Programme,
): { ok: true; programme: Programme } | { ok: false; code: LoyaltyErrorCode } {
  if (!isRecord(input)) return { ok: false, code: 'programme_invalid' };
  const enabled = input.enabled === true;
  const earn = parseEarn(input.earn);
  if (!earn) return { ok: false, code: 'programme_invalid' };
  const tiers = parseTiers(input.tiers);
  if (!tiers) return { ok: false, code: 'programme_invalid' };
  const rewards = parseRewards(input.rewards, random);
  if (!rewards || (enabled && rewards.length === 0))
    return { ok: false, code: 'programme_invalid' };
  const expiry = input.expiryDays;
  if (!(
    expiry === null ||
    (typeof expiry === 'number' && Number.isInteger(expiry) && expiry >= 1)
  )) {
    return { ok: false, code: 'programme_invalid' };
  }
  const ttl = input.claimTtlSeconds;
  if (!(typeof ttl === 'number' && Number.isInteger(ttl) && ttl >= 60 && ttl <= 3600)) {
    return { ok: false, code: 'programme_invalid' };
  }
  const birthday = input.birthdayTreat;
  if (!(birthday === null || typeof birthday === 'string'))
    return { ok: false, code: 'programme_invalid' };
  let currency = previous.currency;
  try {
    currency = currencyCode(venueCurrency);
  } catch {
    return { ok: false, code: 'programme_invalid' };
  }
  return {
    ok: true,
    programme: {
      enabled,
      currency,
      earn,
      tiers,
      rewards,
      expiryDays: expiry,
      claimTtlSeconds: ttl,
      birthdayTreat: birthday,
    },
  };
}

export function programmeFromWire(input: unknown): Programme & { readonly memberCount: number } {
  if (!isRecord(input)) throw new Error('Loyalty programme is not valid');
  const earn = parseEarn(input.earn);
  const tiers = parseTiers(input.tiers);
  if (!earn || !tiers) throw new Error('Loyalty programme is not valid');
  const rewards = Array.isArray(input.rewards)
    ? input.rewards.flatMap((row) =>
        isRecord(row) &&
        typeof row.id === 'string' &&
        typeof row.title === 'string' &&
        typeof row.cost === 'number'
          ? [{ id: row.id, title: row.title, cost: row.cost }]
          : [],
      )
    : [];
  return {
    enabled: input.enabled === true,
    currency: currencyCode(typeof input.currency === 'string' ? input.currency : 'GHS'),
    earn,
    tiers,
    rewards,
    expiryDays: typeof input.expiryDays === 'number' ? input.expiryDays : null,
    claimTtlSeconds: typeof input.claimTtlSeconds === 'number' ? input.claimTtlSeconds : 600,
    birthdayTreat: typeof input.birthdayTreat === 'string' ? input.birthdayTreat : null,
    memberCount: typeof input.memberCount === 'number' ? input.memberCount : 0,
  };
}

function parseEarn(value: unknown): EarnMode | null {
  if (!isRecord(value)) return null;
  if (value.kind === 'stamps') return { kind: 'stamps' };
  if (value.kind !== 'points') return null;
  if (typeof value.points !== 'number' || !Number.isInteger(value.points) || value.points < 1)
    return null;
  if (typeof value.perMinor !== 'number' || !Number.isInteger(value.perMinor) || value.perMinor < 1)
    return null;
  return { kind: 'points', points: value.points, perMinor: value.perMinor };
}

function parseTiers(value: unknown): Programme['tiers'] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const tiers: TierBand[] = [];
  for (let index = 0; index < 3; index += 1) {
    const row = value[index];
    if (!isRecord(row) || row.id !== TIER_IDS[index]) return null;
    if (
      typeof row.minLifetime !== 'number' ||
      !Number.isInteger(row.minLifetime) ||
      row.minLifetime < 0
    )
      return null;
    if (index === 0 && row.minLifetime !== 0) return null;
    const previous = tiers[index - 1];
    if (previous && row.minLifetime <= previous.minLifetime) return null;
    tiers.push({ id: TIER_IDS[index] as TierId, minLifetime: row.minLifetime });
  }
  return tiers as unknown as Programme['tiers'];
}

function parseRewards(value: unknown, random: () => number): RewardOffer[] | null {
  if (!Array.isArray(value)) return null;
  const rewards: RewardOffer[] = [];
  const ids = new Set<string>();
  for (const row of value) {
    if (
      !isRecord(row) ||
      typeof row.title !== 'string' ||
      row.title.trim() === '' ||
      row.title.length > 80
    )
      return null;
    if (typeof row.cost !== 'number' || !Number.isInteger(row.cost) || row.cost < 1) return null;
    const id = typeof row.id === 'string' && row.id.length > 0 ? row.id : `rwd_${draw(random, 8)}`;
    if (ids.has(id)) return null;
    ids.add(id);
    rewards.push({ id, title: row.title.trim(), cost: row.cost });
  }
  return rewards;
}
