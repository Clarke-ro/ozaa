import { Problem } from '../http/problem.ts';
import { customerSummary } from '../shared/loyaltyCustomers.ts';
import { fold } from '../shared/factsFold.ts';
import { cardNumber } from '../shared/factsWire.ts';
import type { Member, VenueLoyalty } from '../shared/factsTypes.ts';
import type { LoyaltyAnalyticsReport, LoyaltyCustomerDetail, LoyaltyCustomerSummary, LoyaltyScanLogEntry, Order } from '../shared/types.ts';

const DAY = 86_400_000;

/**
 * The owner's loyalty desk, worked out from the members' own ledgers. The same steps as the demo
 * (src/mocks/loyaltyDesk.ts), on the venue record loaded from the database.
 */
export function customersOf(venue: VenueLoyalty, now: number): LoyaltyCustomerSummary[] {
  return Object.values(venue.members)
    .map((member) => customerSummary(venue.programme, member, now))
    .sort((a, b) => (b.lastVisitAt ?? b.lastStampAt).localeCompare(a.lastVisitAt ?? a.lastStampAt));
}

/** A member from a scanned QR (cravins://loyalty/<slug>/<id>), a card number or a member id. */
export function memberFrom(venue: VenueLoyalty, code: string): Member {
  const clean = code.trim();
  const id = clean.startsWith('cravins://loyalty/') ? (clean.split('/').pop() ?? '') : clean;
  const digits = clean.replace(/\s/g, '');
  const member = venue.members[id] ?? Object.values(venue.members).find((item) => cardNumber(item.id).replace(/\s/g, '') === digits);
  if (!member) throw new Problem(404, 'card_not_found', 'No loyalty card found for that code.');
  return member;
}

export function customerDetail(venue: VenueLoyalty, member: Member, orders: Map<string, Order>, now: number): LoyaltyCustomerDetail {
  const summary = customerSummary(venue.programme, member, now);
  const dishes = new Map<string, number>();
  const visits = member.facts
    .flatMap((fact) => (fact.kind === 'earn' && fact.source.type === 'paid_visit' ? [fact] : []))
    .map((fact) => {
      const order = orders.get(fact.source.type === 'paid_visit' ? fact.source.orderId : '');
      for (const line of order?.lines ?? []) dishes.set(line.name, (dishes.get(line.name) ?? 0) + line.quantity);
      return {
        at: fact.at,
        orderId: order?.id ?? null,
        orderNumber: order?.number ?? null,
        tableCode: order?.tableCode ?? null,
        source: order?.source ?? 'table',
        summary: order ? order.lines.map((line) => line.name).join(', ') : 'Stamp at the counter',
        totalPesewas: order?.totalPesewas ?? 0,
        stampAdded: true,
      };
    })
    .reverse()
    .slice(0, 20);
  const next = venue.programme.rewards.find((reward) => reward.cost > summary.stamps) ?? venue.programme.rewards[0];
  return {
    ...summary,
    stampsRequired: next?.cost ?? 1,
    nextReward: next?.title ?? null,
    favouriteItem: [...dishes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    visits,
    consent: {
      loyaltyAt: member.consent.at,
      textVersion: member.consent.textVersion,
      marketing: member.consent.marketing,
      marketingAt: member.consent.marketing ? member.consent.at : null,
    },
  } as LoyaltyCustomerDetail;
}

/** New members, stamps given and rewards confirmed, day by day over the range. */
export function analyticsOf(venue: VenueLoyalty, range: '7d' | '30d' | '90d', now: number): LoyaltyAnalyticsReport {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = now - days * DAY;
  const series = Array.from({ length: days }, (_, i) => ({
    date: new Date(start + (i + 1) * DAY).toISOString().slice(0, 10),
    newEnrollments: 0,
    stampsIssued: 0,
    rewardsRedeemed: 0,
  }));
  const bucket = (iso: string) => series[Math.min(days - 1, Math.floor((Date.parse(iso) - start) / DAY))];
  let newEnrollments = 0;
  let stampsIssued = 0;
  let rewardsRedeemed = 0;
  for (const member of Object.values(venue.members)) {
    if (Date.parse(member.consent.at) >= start) {
      newEnrollments += 1;
      const row = bucket(member.consent.at);
      if (row) row.newEnrollments += 1;
    }
    for (const fact of member.facts) {
      if (Date.parse(fact.at) < start || Date.parse(fact.at) > now) continue;
      const row = bucket(fact.at);
      if (fact.kind === 'earn') {
        stampsIssued += fact.units;
        if (row) row.stampsIssued += fact.units;
      } else if (fact.kind === 'confirm') {
        rewardsRedeemed += 1;
        if (row) row.rewardsRedeemed += 1;
      }
    }
  }
  return { range, enrolledCount: Object.keys(venue.members).length, stampsIssued, rewardsRedeemed, newEnrollments, series };
}

/**
 * "Today" on Scan and stamp: stamps and rewards staff gave, newest first. Built from the ledger
 * lines that carry who gave them, with the balance as it stood just after each.
 */
export function scanLogOf(venue: VenueLoyalty, byOf: Map<string, string | null>, since: number): LoyaltyScanLogEntry[] {
  const rows: (LoyaltyScanLogEntry & { seq: number })[] = [];
  for (const member of Object.values(venue.members)) {
    member.facts.forEach((fact, i) => {
      if (!byOf.has(fact.id) || Date.parse(fact.at) < since) return;
      if (fact.kind === 'claim') return;
      const stampsAfter = fold(venue.programme, member.facts.slice(0, i + 1), fact.at).balance;
      rows.push({
        id: fact.id,
        at: fact.at,
        customerId: member.id,
        customerName: member.firstName ?? 'Guest',
        action: fact.kind === 'earn' ? 'stamp' : 'reward',
        stampsAfter,
        reward: fact.kind === 'confirm' ? fact.title : null,
        by: byOf.get(fact.id) ?? null,
        // Two lines at the same moment (a last stamp, then the reward) keep the order they happened in.
        seq: i,
      });
    });
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at) || b.seq - a.seq).map(({ seq: _seq, ...row }) => row);
}
