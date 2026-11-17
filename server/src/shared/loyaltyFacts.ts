// Generated from src/features/loyalty/facts.ts by scripts/sync-server-shared.mjs. Do not edit here.
/**
 * One venue record. The balance, tier, and "ready" flag are a fold of `facts`.
 * apply is the only mutation. Screens read walletFromWire.
 * Chosen from the two sketches: candidate 2 is the base (one apply), with the
 * wallet face and staff-only debit both sketches agreed on. A stamps/points
 * switch is refused after the first earn, so the fold never mixes units.
 */

import {
  blankVenue,
  brand,
  currencyCode,
  draw,
  fail,
  LOYALTY_PROBLEMS,
  minor,
  ok,
  PROGRESS_STATES,
  replace,
  samplePhone,
  TIER_IDS,
  unbrand,
  type Command,
  type CurrencyCode,
  type EarnMode,
  type Fact,
  type HistoryRow,
  type LoyaltyErrorCode,
  type Member,
  type Minor,
  type Programme,
  type ProgressState,
  type RewardOffer,
  type Step,
  type TierBand,
  type TierId,
  type VenueLoyalty,
  type Wallet,
} from './factsTypes.ts';
import { factKey, featured, fold } from './factsFold.ts';
import { parseProgramme, programmeFromWire } from './factsParse.ts';
import { seedVenueLoyalty, toWire, walletFromWire } from './factsWire.ts';

export function apply(venue: VenueLoyalty, command: Command, now: string): Step {
  if (command.type === 'join') return join(venue, command, now);
  if (command.type === 'leave') return leave(venue, command);
  if (command.type === 'paid_visit') return paidVisit(venue, command, now);
  if (command.type === 'game_win') return gameWin(venue, command, now);
  if (command.type === 'open_claim') return openClaim(venue, command, now);
  if (command.type === 'confirm') return confirm(venue, command, now);
  return saveProgramme(venue, command, now);
}

function join(venue: VenueLoyalty, command: Extract<Command, { type: 'join' }>, now: string): Step {
  if (!command.consent.loyalty) return fail('consent_required');
  if (!venue.programme.enabled) return fail('programme_off');
  const existing = Object.values(venue.members).find((member) => member.phone === command.phone);
  if (existing) {
    const next = replace(venue, {
      ...existing,
      firstName: command.firstName ?? existing.firstName,
      birthdayMonthDay: command.birthdayMonthDay ?? existing.birthdayMonthDay,
      consent: {
        marketing: command.consent.marketing,
        at: now,
        textVersion: command.consent.textVersion,
      },
    });
    return ok(next, 'duplicate', existing.id);
  }
  const id = `mem_${draw(command.random, 12)}`;
  const member: Member = {
    id,
    phone: command.phone,
    firstName: command.firstName ?? null,
    birthdayMonthDay: command.birthdayMonthDay ?? null,
    memberSince: now.slice(0, 10),
    consent: {
      marketing: command.consent.marketing,
      at: now,
      textVersion: command.consent.textVersion,
    },
    facts: [],
  };
  return ok(replace(venue, member), 'posted', id);
}

function leave(venue: VenueLoyalty, command: Extract<Command, { type: 'leave' }>): Step {
  const existing = Object.values(venue.members).find((member) => member.phone === command.phone);
  if (!existing) return ok(venue, 'skipped', null);
  const members = { ...venue.members };
  delete members[existing.id];
  return ok(brand({ ...unbrand(venue), members }), 'posted', existing.id);
}

function paidVisit(
  venue: VenueLoyalty,
  command: Extract<Command, { type: 'paid_visit' }>,
  now: string,
): Step {
  if (!command.paid || !venue.programme.enabled) return ok(venue, 'skipped', null);
  const phone = command.loyaltyPhone ?? command.momoPhone;
  const member = phone
    ? Object.values(venue.members).find((item) => item.phone === phone)
    : undefined;
  if (!member) return ok(venue, 'skipped', null);
  if (command.currency !== venue.programme.currency) return fail('currency_mismatch');
  const key = `earn:order:${command.orderId}`;
  if (member.facts.some((fact) => factKey(fact) === key)) return ok(venue, 'duplicate', member.id);
  const units =
    venue.programme.earn.kind === 'stamps'
      ? 1
      : Math.floor(command.amountMinor / venue.programme.earn.perMinor) *
        venue.programme.earn.points;
  const fact: Fact = {
    kind: 'earn',
    id: `ern_${command.orderId}`,
    at: now,
    units,
    source: {
      type: 'paid_visit',
      orderId: command.orderId,
      amountMinor: command.amountMinor,
      currency: command.currency,
    },
  };
  return ok(replace(venue, { ...member, facts: [...member.facts, fact] }), 'posted', member.id);
}

function gameWin(
  venue: VenueLoyalty,
  command: Extract<Command, { type: 'game_win' }>,
  now: string,
): Step {
  if (!command.enabled || !venue.programme.enabled || command.score < command.minScore) {
    return ok(venue, 'skipped', null);
  }
  const member = Object.values(venue.members).find((item) => item.phone === command.phone);
  if (!member) return ok(venue, 'skipped', null);
  const day = now.slice(0, 10);
  const key = `earn:game:${day}`;
  if (member.facts.some((fact) => factKey(fact) === key)) return ok(venue, 'duplicate', member.id);
  const units = venue.programme.earn.kind === 'stamps' ? 1 : venue.programme.earn.points;
  const fact: Fact = {
    kind: 'earn',
    id: `ern_game_${command.runId}`,
    at: now,
    units,
    source: { type: 'game', runId: command.runId, day },
  };
  return ok(replace(venue, { ...member, facts: [...member.facts, fact] }), 'posted', member.id);
}

function openClaim(
  venue: VenueLoyalty,
  command: Extract<Command, { type: 'open_claim' }>,
  now: string,
): Step {
  const member = Object.values(venue.members).find((item) => item.phone === command.phone);
  if (!member) return fail('not_a_member');
  if (!venue.programme.enabled) return fail('programme_off');
  const reward = venue.programme.rewards.find((item) => item.id === command.rewardId);
  if (!reward) return fail('reward_unknown');
  const folded = fold(venue.programme, member.facts, now);
  if (folded.live) {
    if (folded.live.title === reward.title) return ok(venue, 'duplicate', member.id);
    return fail('claim_open');
  }
  if (folded.balance < reward.cost) return fail('cannot_afford');
  const codes = new Set(
    Object.values(venue.members).flatMap((item) =>
      item.facts.filter((fact) => fact.kind === 'claim').map((fact) => fact.code),
    ),
  );
  let code = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = draw(command.random, 6);
    if (!codes.has(code)) break;
    code = '';
  }
  if (!code) return fail('code_taken');
  const claim: Fact = {
    kind: 'claim',
    id: `clm_${draw(command.random, 8)}`,
    at: now,
    code,
    rewardId: reward.id,
    title: reward.title,
    units: reward.cost,
    expiresAt: new Date(Date.parse(now) + venue.programme.claimTtlSeconds * 1000).toISOString(),
  };
  return ok(replace(venue, { ...member, facts: [...member.facts, claim] }), 'posted', member.id);
}

function confirm(
  venue: VenueLoyalty,
  command: Extract<Command, { type: 'confirm' }>,
  now: string,
): Step {
  const cleanCode = command.code.trim().toUpperCase();
  const found = Object.values(venue.members).flatMap((member) =>
    member.facts
      .filter((fact) => fact.kind === 'claim' && fact.code === cleanCode)
      .map((fact) => ({ member, fact })),
  );
  if (found.length !== 1) return fail('claim_unknown');
  const hit = found[0];
  if (!hit || hit.fact.kind !== 'claim') return fail('claim_unknown');
  if (hit.member.facts.some((fact) => fact.kind === 'confirm' && fact.claimId === hit.fact.id)) {
    return ok(venue, 'duplicate', hit.member.id);
  }
  if (Date.parse(hit.fact.expiresAt) <= Date.parse(now)) return fail('claim_expired');
  const row: Fact = {
    kind: 'confirm',
    id: `cfm_${hit.fact.id}`,
    at: now,
    claimId: hit.fact.id,
    rewardId: hit.fact.rewardId,
    title: hit.fact.title,
    units: hit.fact.units,
  };
  return ok(
    replace(venue, { ...hit.member, facts: [...hit.member.facts, row] }),
    'posted',
    hit.member.id,
  );
}

function saveProgramme(
  venue: VenueLoyalty,
  command: Extract<Command, { type: 'save_programme' }>,
  _now: string,
): Step {
  const parsed = parseProgramme(
    command.input,
    command.venueCurrency,
    command.random,
    venue.programme,
  );
  if (!parsed.ok) return fail(parsed.code);
  const earned = Object.values(venue.members).some((member) =>
    member.facts.some((fact) => fact.kind === 'earn' && fact.units > 0),
  );
  if (earned && parsed.programme.earn.kind !== venue.programme.earn.kind)
    return fail('earn_mode_locked');
  return ok(brand({ ...unbrand(venue), programme: parsed.programme }), 'posted', null);
}

export {
  blankVenue,
  currencyCode,
  featured,
  LOYALTY_PROBLEMS,
  minor,
  programmeFromWire,
  PROGRESS_STATES,
  samplePhone,
  seedVenueLoyalty,
  TIER_IDS,
  toWire,
  walletFromWire,
  type Command,
  type CurrencyCode,
  type EarnMode,
  type Fact,
  type HistoryRow,
  type LoyaltyErrorCode,
  type Minor,
  type Programme,
  type ProgressState,
  type RewardOffer,
  type Step,
  type TierBand,
  type TierId,
  type VenueLoyalty,
  type Wallet,
};
