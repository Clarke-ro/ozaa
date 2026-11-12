import type { GhanaPhone } from '@/lib/brand';
import {
  brand,
  isRecord,
  type Fact,
  type Member,
  type Programme,
  type ProgressState,
  type VenueLoyalty,
  type Wallet,
} from './factsTypes';
import { featured, fold } from './factsFold';
import { historyOf } from './factsHistory';
import { programmeFromWire } from './factsParse';

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

export function maskPhone(phone: GhanaPhone): string {
  const national = phone.slice(4);
  return `0${national.slice(0, 2)} *** ${national.slice(-4)}`;
}

export function cardNumber(memberId: string): string {
  let hash = 0x811c9dc5;
  for (const char of memberId) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  const body = (hash >>> 0).toString().padStart(12, '0').slice(0, 12);
  return `${body.slice(0, 4)} ${body.slice(4, 8)} ${body.slice(8, 12)}`;
}
