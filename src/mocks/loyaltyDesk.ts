import { blankVenue } from '../features/loyalty/facts';
import { customerSummary } from '../features/loyalty/customers';
import { cardNumber } from '../features/loyalty/factsWire';
import type { Member, VenueLoyalty } from '../features/loyalty/factsTypes';
import { ApiError } from '@/lib/api/errors';
import type {
  LoyaltyAnalyticsReport,
  LoyaltyCustomerDetail,
  LoyaltyCustomerSummary,
} from '@/lib/api/types';
import { venueById } from './world';
import type { World } from './worldTypes';

const DAY = 86_400_000;

export function loyaltyOf(world: World, venueId: string): VenueLoyalty {
  const venue = venueById(world, venueId);
  return world.loyalty[venueId] ?? blankVenue(venueId, venue.currency);
}

export function customersOf(world: World, venueId: string, now: number): LoyaltyCustomerSummary[] {
  const loyalty = loyaltyOf(world, venueId);
  return Object.values(loyalty.members)
    .map((member) => customerSummary(loyalty.programme, member, now))
    .sort((a, b) => (b.lastVisitAt ?? b.lastStampAt).localeCompare(a.lastVisitAt ?? a.lastStampAt));
}

/** A member from a scanned QR (cravins://loyalty/<slug>/<id>), a card number or a member id. */
export function memberFrom(world: World, venueId: string, code: string): Member {
  const loyalty = loyaltyOf(world, venueId);
  const clean = code.trim();
  const id = clean.startsWith('cravins://loyalty/') ? (clean.split('/').pop() ?? '') : clean;
  const digits = clean.replace(/\s/g, '');
  const member =
    loyalty.members[id] ??
    Object.values(loyalty.members).find(
      (item) => cardNumber(item.id).replace(/\s/g, '') === digits,
    );
  if (!member) throw new ApiError(404, 'card_not_found', 'No loyalty card found for that code');
  return member;
}

export function customerDetail(
  world: World,
  venueId: string,
  customerId: string,
  now: number,
): LoyaltyCustomerDetail {
  const loyalty = loyaltyOf(world, venueId);
  const member = loyalty.members[customerId];
  if (!member) throw new ApiError(404, 'not_found', 'That guest left the loyalty card');
  const summary = customerSummary(loyalty.programme, member, now);
  const orders = new Map(world.orders.map((row) => [row.order.id, row.order]));
  const dishes = new Map<string, number>();
  const visits = member.facts
    .flatMap((fact) => (fact.kind === 'earn' && fact.source.type === 'paid_visit' ? [fact] : []))
    .map((fact) => {
      const orderId = fact.source.type === 'paid_visit' ? fact.source.orderId : '';
      const order = orders.get(orderId);
      for (const line of order?.lines ?? [])
        dishes.set(line.name, (dishes.get(line.name) ?? 0) + line.quantity);
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
  const next =
    loyalty.programme.rewards.find((reward) => reward.cost > summary.stamps) ??
    loyalty.programme.rewards[0];
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
  };
}

/** Loyalty results from the members' own facts, day by day over the range. */
export function analyticsOf(
  world: World,
  venueId: string,
  range: '7d' | '30d' | '90d',
  now: number,
): LoyaltyAnalyticsReport {
  const loyalty = loyaltyOf(world, venueId);
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = now - days * DAY;
  const series = Array.from({ length: days }, (_, i) => ({
    date: new Date(start + (i + 1) * DAY).toISOString().slice(0, 10),
    newEnrollments: 0,
    stampsIssued: 0,
    rewardsRedeemed: 0,
  }));
  const bucket = (iso: string) =>
    series[Math.min(days - 1, Math.floor((Date.parse(iso) - start) / DAY))];
  let newEnrollments = 0;
  let stampsIssued = 0;
  let rewardsRedeemed = 0;
  for (const member of Object.values(loyalty.members)) {
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
  return {
    range,
    enrolledCount: Object.keys(loyalty.members).length,
    stampsIssued,
    rewardsRedeemed,
    newEnrollments,
    series,
  };
}
