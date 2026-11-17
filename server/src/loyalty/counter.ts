import { randomInt } from 'node:crypto';
import type { Db } from '../db/client.ts';
import { Problem } from '../http/problem.ts';
import { fold } from '../shared/factsFold.ts';
import type { Member, VenueLoyalty } from '../shared/factsTypes.ts';
import { minor, toWire } from '../shared/loyaltyFacts.ts';
import type { LoyaltyCard, LoyaltyScanResult } from '../shared/types.ts';
import { memberFrom } from './desk.ts';
import { loadLoyalty, step } from './store.ts';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const random = () => randomInt(0, 2 ** 32) / 2 ** 32;
// One stamp per guest per hour from a scan, so a double tap or a second scan doesn't add two.
const SCAN_COOLDOWN_MS = 60 * 60_000;

/** One stamp at the counter, with the hourly cooldown, as staff name it in the scan log. */
export async function counterStamp(tx: Tx, venueId: string, currency: string, code: string, by: string, now: number): Promise<LoyaltyScanResult> {
  const record = await loadLoyalty(tx, venueId, currency, 'all');
  const member = memberFrom(record, code);
  const balance = (r: VenueLoyalty, m: Member) => fold(r.programme, r.members[m.id]?.facts ?? [], new Date(now).toISOString()).balance;
  const lastEarn = member.facts.filter((fact) => fact.kind === 'earn').at(-1);
  const card = (r: VenueLoyalty) => toWire(r, { kind: 'member', memberId: member.id }) as LoyaltyCard;
  if (lastEarn && now - Date.parse(lastEarn.at) < SCAN_COOLDOWN_MS) {
    return {
      success: false,
      card: card(record),
      customerName: member.firstName ?? 'Guest',
      stamps: balance(record, member),
      cooldownViolated: true,
      cooldownRemainingSeconds: Math.ceil((SCAN_COOLDOWN_MS - (now - Date.parse(lastEarn.at))) / 1000),
      rewardUnlocked: false,
    };
  }
  const before = balance(record, member);
  // A counter stamp is a visit with no Cravins order behind it, so it carries no amount.
  const { after } = await step(
    tx,
    record,
    { type: 'paid_visit', orderId: `scan_${randomInt(0, 2 ** 31)}`, amountMinor: minor(0), currency: record.programme.currency, paid: true, loyaltyPhone: member.phone, momoPhone: null },
    now,
    by,
  );
  const stamps = balance(after, member);
  return {
    success: true,
    card: card(after),
    customerName: member.firstName ?? 'Guest',
    stamps,
    cooldownViolated: false,
    cooldownRemainingSeconds: 0,
    rewardUnlocked: record.programme.rewards.some((reward) => before < reward.cost && stamps >= reward.cost),
  };
}

/** The first reward they can afford, given now: the guest's claim and the staff confirm in one go. */
export async function counterReward(tx: Tx, venueId: string, currency: string, code: string, by: string, now: number): Promise<LoyaltyScanResult> {
  const record = await loadLoyalty(tx, venueId, currency, 'all');
  const member = memberFrom(record, code);
  const nowIso = new Date(now).toISOString();
  const { balance } = fold(record.programme, member.facts, nowIso);
  const offer = record.programme.rewards.filter((item) => item.cost <= balance).sort((a, b) => a.cost - b.cost)[0];
  if (!offer) throw new Problem(409, 'cannot_afford', 'That reward needs more on the card.');
  const opened = await step(tx, record, { type: 'open_claim', phone: member.phone, rewardId: offer.id, random }, now);
  const claim = opened.after.members[member.id]?.facts.findLast((fact) => fact.kind === 'claim');
  if (!claim || claim.kind !== 'claim') throw new Problem(404, 'claim_unknown', 'That code is not active.');
  const { after } = await step(tx, opened.after, { type: 'confirm', code: claim.code }, now, by);
  const left = after.members[member.id];
  return {
    success: true,
    card: toWire(after, { kind: 'member', memberId: member.id }) as LoyaltyCard,
    customerName: member.firstName ?? 'Guest',
    stamps: left ? fold(after.programme, left.facts, nowIso).balance : 0,
    cooldownViolated: false,
    cooldownRemainingSeconds: 0,
    rewardUnlocked: false,
    message: offer.title,
  };
}
