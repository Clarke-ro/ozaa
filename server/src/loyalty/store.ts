import { and, count, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { loyaltyFacts, loyaltyMembers, loyaltyPrograms } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import { ghanaPhone } from '../shared/brand.ts';
import { apply, blankVenue, LOYALTY_PROBLEMS, programmeFromWire, toWire, type Command, type Fact, type VenueLoyalty } from '../shared/loyaltyFacts.ts';
import { brand, type Member } from '../shared/factsTypes.ts';
import type { LoyaltyCard } from '../shared/types.ts';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type MemberRow = typeof loyaltyMembers.$inferSelect;
type FactRow = typeof loyaltyFacts.$inferSelect;

function factOf(row: FactRow): Fact {
  return { kind: row.kind, id: row.id, at: row.at.toISOString(), units: row.units, ...(row.details as object) } as Fact;
}

function memberOf(row: MemberRow, facts: FactRow[]): Member {
  return {
    id: row.id,
    phone: ghanaPhone(row.phone),
    firstName: row.firstName,
    birthdayMonthDay: row.birthdayMonthDay,
    // The contract's memberSince is a calendar date (YYYY-MM-DD), as the shared rules write it.
    memberSince: row.memberSince.toISOString().slice(0, 10),
    consent: { marketing: row.marketingConsent, at: row.consentAt.toISOString(), textVersion: row.consentTextVersion },
    facts: facts.filter((f) => f.memberId === row.id).sort((a, b) => a.at.getTime() - b.at.getTime()).map(factOf),
  };
}

/**
 * The venue's loyalty record as the shared rules (src/features/loyalty/facts.ts) expect it, with
 * just the members a step needs. Inside a transaction the member rows are locked, so two taps at
 * once (say, two redeem buttons) run one after the other and can't both spend the same stamps.
 */
export async function loadLoyalty(tx: Tx, venueId: string, currency: string, who: { phone: string } | { memberId: string } | 'none'): Promise<VenueLoyalty> {
  const [programmeRow] = await tx.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.venueId, venueId));
  const programme = programmeRow ? programmeFromWire(programmeRow.programme) : blankVenue(venueId, currency).programme;
  let members: MemberRow[] = [];
  if (who !== 'none') {
    const match = 'phone' in who ? eq(loyaltyMembers.phone, who.phone) : eq(loyaltyMembers.id, who.memberId);
    members = await tx.select().from(loyaltyMembers).where(and(eq(loyaltyMembers.venueId, venueId), match, isNull(loyaltyMembers.leftAt))).for('update');
  }
  const facts = members.length ? await tx.select().from(loyaltyFacts).where(eq(loyaltyFacts.memberId, members[0]!.id)) : [];
  return brand({ venueId, programme, members: Object.fromEntries(members.map((m) => [m.id, memberOf(m, facts)])) });
}

/**
 * Runs one command through the shared rules and saves what changed: a new member, changed member
 * details, new facts (the ledger only grows) or a member who left (their row and facts go).
 */
export async function step(tx: Tx, before: VenueLoyalty, command: Command, now: number): Promise<{ after: VenueLoyalty; effect: 'posted' | 'duplicate' | 'skipped'; memberId: string | null }> {
  const result = apply(before, command, new Date(now).toISOString());
  if (!result.ok) {
    const problem = LOYALTY_PROBLEMS[result.error.code];
    throw new Problem(problem.status as 400 | 404 | 409, result.error.code, `${problem.title}.`);
  }
  const after = result.next;
  for (const member of Object.values(after.members)) {
    const old = before.members[member.id];
    const details = {
      firstName: member.firstName,
      birthdayMonthDay: member.birthdayMonthDay,
      marketingConsent: member.consent.marketing,
      consentAt: new Date(member.consent.at),
      consentTextVersion: member.consent.textVersion,
    };
    if (!old) {
      await tx.insert(loyaltyMembers).values({ id: member.id, venueId: after.venueId, phone: member.phone, memberSince: new Date(member.memberSince), ...details });
    } else {
      await tx.update(loyaltyMembers).set(details).where(eq(loyaltyMembers.id, member.id));
    }
    const known = new Set(old?.facts.map((f) => f.id) ?? []);
    const added = member.facts.filter((f) => !known.has(f.id));
    if (added.length) {
      await tx.insert(loyaltyFacts).values(
        added.map(({ kind, id, at, units, ...details }) => ({ id, memberId: member.id, venueId: after.venueId, kind, at: new Date(at), units, details })),
      );
    }
  }
  // Leaving deletes their loyalty data here (Act 843): the row and its ledger go together.
  for (const id of Object.keys(before.members)) {
    if (!after.members[id]) await tx.delete(loyaltyMembers).where(eq(loyaltyMembers.id, id));
  }
  return { after, effect: result.effect, memberId: result.memberId };
}

/** The card as the contract shows it, with the real member count (the record holds one member). */
export async function cardOf(tx: Tx, venue: VenueLoyalty, phone: string): Promise<LoyaltyCard | null> {
  const card = toWire(venue, { kind: 'card', phone: ghanaPhone(phone) }) as LoyaltyCard | null;
  if (!card) return null;
  card.programme = { ...card.programme, memberCount: await memberCount(tx, venue.venueId) };
  return card;
}

export async function memberCount(tx: Tx | Db, venueId: string): Promise<number> {
  const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(loyaltyMembers).where(and(eq(loyaltyMembers.venueId, venueId), isNull(loyaltyMembers.leftAt)));
  return n;
}
