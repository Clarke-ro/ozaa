import type { GhanaPhone } from '@/lib/brand';
import {
  brand,
  currencyCode,
  DAY,
  draw,
  isRecord,
  TIER_IDS,
  type EarnMode,
  type Fact,
  type HistoryRow,
  type LoyaltyErrorCode,
  type Member,
  type Programme,
  type ProgressState,
  type RewardOffer,
  type TierBand,
  type TierId,
  type VenueLoyalty,
  type Wallet,
} from './factsTypes';

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

export function walletFromWire(input: unknown, now: string, venueSlug: string): Wallet {
  const card = asCard(input);
  const member = card.member;
  const programme = card.programme;
  const folded = fold(programme, member.facts, now);
  const next = featured(programme);
  const left = next ? Math.max(0, next.cost - folded.balance) : null;
  let state: ProgressState = 'more';
  if (folded.live) state = 'pending';
  else if (next && folded.balance >= next.cost) state = 'ready';
  else if (left === 1) state = 'one';
  else if (folded.balance === 0) state = 'empty';
  return {
    memberId: member.id,
    guestName: member.firstName,
    phoneMasked: member.phoneMasked,
    memberSince: member.memberSince,
    tier: folded.tier,
    progress: {
      kind: programme.earn.kind,
      state,
      balance: folded.balance,
      lifetime: folded.lifetime,
      nextCost: next?.cost ?? null,
      left,
    },
    cardNumber: cardNumber(member.id),
    qrPayload: `cravins://loyalty/${venueSlug}/${member.id}`,
    catalogue: programme.rewards.map((reward) => ({
      id: reward.id,
      title: reward.title,
      cost: reward.cost,
      affordable: folded.balance >= reward.cost && !folded.live,
    })),
    liveClaim: folded.live,
    history: historyOf(member.facts),
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

export function seedVenueLoyalty(
  venueId: string,
  cardInput: unknown,
  phone: GhanaPhone,
): VenueLoyalty {
  const card = asCard(cardInput);
  const rawMember = isRecord(cardInput) && isRecord(cardInput.member) ? cardInput.member : {};
  const rawConsent = isRecord(rawMember.consent) ? rawMember.consent : {};
  const member: Member = {
    id: card.member.id,
    phone,
    firstName: card.member.firstName,
    birthdayMonthDay:
      typeof rawMember.birthdayMonthDay === 'string' ? rawMember.birthdayMonthDay : null,
    memberSince: card.member.memberSince,
    consent: {
      marketing: rawConsent.marketing === true,
      at: typeof rawConsent.at === 'string' ? rawConsent.at : '2026-03-14T18:02:00Z',
      textVersion:
        typeof rawConsent.textVersion === 'string' ? rawConsent.textVersion : 'consent-2026-10-v1',
    },
    facts: card.member.facts,
  };
  return brand({ venueId, programme: card.programme, members: { [member.id]: member } });
}

export function toWire(
  venue: VenueLoyalty,
  request:
    | { kind: 'card'; phone: GhanaPhone }
    | { kind: 'member'; memberId: string }
    | { kind: 'programme' }
    | { kind: 'summary' }
    | { kind: 'roster' },
): unknown {
  if (request.kind === 'programme') return programmeWire(venue);
  if (request.kind === 'summary') {
    const reward = featured(venue.programme);
    return {
      enabled: venue.programme.enabled,
      kind: venue.programme.earn.kind,
      nextCost: reward?.cost ?? null,
      headline: reward?.title ?? null,
    };
  }
  if (request.kind === 'roster') {
    return Object.values(venue.members).map((member) => cardWire(venue, member));
  }
  if (request.kind === 'member') {
    const member = venue.members[request.memberId];
    return member ? cardWire(venue, member) : null;
  }
  const member = Object.values(venue.members).find((item) => item.phone === request.phone);
  return member ? cardWire(venue, member) : null;
}

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

export function featured(programme: Programme): RewardOffer | null {
  return programme.rewards.reduce<RewardOffer | null>(
    (best, reward) => (!best || reward.cost < best.cost ? reward : best),
    null,
  );
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

function historyOf(facts: readonly Fact[]): HistoryRow[] {
  return facts.flatMap<HistoryRow>((fact): HistoryRow[] => {
    if (fact.kind === 'earn' && fact.source.type === 'paid_visit') {
      return [
        {
          at: fact.at,
          source: 'paid_visit',
          direction: 'in',
          units: fact.units,
          title: null,
          amountMinor: fact.source.amountMinor,
          currency: fact.source.currency,
        },
      ];
    }
    if (fact.kind === 'earn' && fact.source.type === 'game') {
      return [
        {
          at: fact.at,
          source: 'game',
          direction: 'in',
          units: fact.units,
          title: null,
          amountMinor: null,
          currency: null,
        },
      ];
    }
    if (fact.kind === 'earn' && fact.source.type === 'birthday') {
      return [
        {
          at: fact.at,
          source: 'birthday',
          direction: 'in',
          units: fact.units,
          title: fact.source.title,
          amountMinor: null,
          currency: null,
        },
      ];
    }
    if (fact.kind === 'confirm') {
      return [
        {
          at: fact.at,
          source: 'redeem',
          direction: 'out',
          units: fact.units,
          title: fact.title,
          amountMinor: null,
          currency: null,
        },
      ];
    }
    return [];
  });
}

function cardWire(venue: VenueLoyalty, member: Member) {
  return {
    programme: programmeWire(venue),
    member: {
      id: member.id,
      firstName: member.firstName,
      phoneMasked: maskPhone(member.phone),
      birthdayMonthDay: member.birthdayMonthDay,
      memberSince: member.memberSince,
      consent: member.consent,
      facts: member.facts,
    },
  };
}

function programmeWire(venue: VenueLoyalty) {
  return { ...venue.programme, memberCount: Object.keys(venue.members).length };
}

function asCard(input: unknown): {
  programme: Programme;
  member: {
    id: string;
    firstName: string | null;
    phoneMasked: string;
    memberSince: string;
    facts: Fact[];
  };
} {
  if (!isRecord(input) || !isRecord(input.programme) || !isRecord(input.member))
    throw new Error('Loyalty card is not valid');
  const programme = programmeFromWire(input.programme);
  const member = input.member;
  if (typeof member.id !== 'string' || typeof member.memberSince !== 'string')
    throw new Error('Loyalty card is not valid');
  return {
    programme,
    member: {
      id: member.id,
      firstName: typeof member.firstName === 'string' ? member.firstName : null,
      phoneMasked: typeof member.phoneMasked === 'string' ? member.phoneMasked : '',
      memberSince: member.memberSince,
      facts: Array.isArray(member.facts) ? (member.facts as Fact[]) : [],
    },
  };
}

function maskPhone(phone: GhanaPhone): string {
  const national = phone.slice(4);
  return `0${national.slice(0, 2)} *** ${national.slice(-4)}`;
}

function cardNumber(memberId: string): string {
  let hash = 0x811c9dc5;
  for (const char of memberId) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  const body = (hash >>> 0).toString().padStart(12, '0').slice(0, 12);
  return `${body.slice(0, 4)} ${body.slice(4, 8)} ${body.slice(8, 12)}`;
}
