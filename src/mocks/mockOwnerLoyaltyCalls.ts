import { blankVenue, LOYALTY_PROBLEMS, toWire } from '../features/loyalty/facts';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { LoyaltyCard, LoyaltyProgram } from '@/lib/api/types';
import { keepLoyalty, STAFF, venueById } from './world';
import { accessOf, ownerOnly } from './mockRules';
import { analyticsOf, customerDetail, customersOf, memberFrom } from './loyaltyDesk';
import { rewardMember, stampMember } from './loyaltyStamps';
import type { MockContext } from './mockContext';

/** Mock calls: the owner's loyalty programme, members, analytics and card scanning. */
export function mockOwnerLoyaltyCalls(ctx: MockContext) {
  const { world, tokens, now, random, gate, remember } = ctx;
  const staffName = () => {
    const phone = accessOf(world, tokens).phone;
    return STAFF.find((person) => person.phone === phone)?.firstName ?? 'Staff';
  };
  return {
    async ownerGetLoyalty(venueId) {
      await gate();
      const venue = venueById(world, venueId);
      const current = world.loyalty[venueId] ?? blankVenue(venueId, venue.currency);
      return {
        ...(toWire(current, { kind: 'programme' }) as LoyaltyProgram),
        stampOnPaidOrder: !world.noAutoStamp.has(venueId),
      };
    },
    async ownerSetLoyalty(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const { venue: next } = keepLoyalty(
        world,
        venueId,
        { type: 'save_programme', input: body, venueCurrency: venue.currency, random },
        new Date(now()).toISOString(),
      );
      if (body.stampOnPaidOrder === false) world.noAutoStamp.add(venueId);
      if (body.stampOnPaidOrder === true) world.noAutoStamp.delete(venueId);
      return {
        ...(toWire(next, { kind: 'programme' }) as LoyaltyProgram),
        stampOnPaidOrder: !world.noAutoStamp.has(venueId),
      };
    },
    async ownerListLoyaltyMembers(venueId) {
      await gate();
      const venue = venueById(world, venueId);
      const current = world.loyalty[venueId] ?? blankVenue(venueId, venue.currency);
      return { items: toWire(current, { kind: 'roster' }) as LoyaltyCard[], nextCursor: null };
    },
    async ownerConfirmRedemption(venueId, body, call) {
      await gate();
      return remember(call?.idempotencyKey, () => {
        venueById(world, venueId);
        const { venue: next, memberId } = keepLoyalty(
          world,
          venueId,
          { type: 'confirm', code: body.code },
          new Date(now()).toISOString(),
        );
        const card = memberId ? toWire(next, { kind: 'member', memberId }) : null;
        if (!card) throw new ApiError(404, 'claim_unknown', LOYALTY_PROBLEMS.claim_unknown.title);
        return card as LoyaltyCard;
      });
    },
    async ownerGetLoyaltyAnalytics(venueId, range = '30d') {
      await gate();
      accessOf(world, tokens);
      return analyticsOf(world, venueId, range, now());
    },
    async ownerListLoyaltyCustomers(venueId, query) {
      await gate();
      accessOf(world, tokens);
      const all = customersOf(world, venueId, now());
      let items = all;
      if (query?.wantsOffers !== undefined)
        items = items.filter((c) => c.wantsOffers === query.wantsOffers);
      if (query?.search) {
        const q = query.search.trim().toLowerCase();
        // Name, or the last 4 digits of the phone; the full number is never sent.
        items = items.filter(
          (c) =>
            c.name.toLowerCase().includes(q) || (/^\d{1,4}$/.test(q) && c.phoneMasked.endsWith(q)),
        );
      }
      const countsByTag: Record<string, number> = {};
      for (const c of items)
        for (const tag of c.tags ?? []) countsByTag[tag] = (countsByTag[tag] ?? 0) + 1;
      if (query?.tag) items = items.filter((c) => c.tags?.includes(query.tag!));
      return { items, totalCount: all.length, countsByTag };
    },
    async ownerGetLoyaltyCustomer(venueId, customerId) {
      await gate();
      accessOf(world, tokens);
      return customerDetail(world, venueId, customerId, now());
    },
    async ownerRemoveLoyaltyCustomer(venueId, customerId) {
      await gate();
      ownerOnly(world, tokens);
      const member = memberFrom(world, venueId, customerId);
      // The same erasure as a guest leaving: the card, stamps and consent go.
      keepLoyalty(
        world,
        venueId,
        { type: 'leave', phone: member.phone },
        new Date(now()).toISOString(),
      );
    },
    async ownerStampLoyaltyCustomer(venueId, customerId, call) {
      await gate();
      const by = staffName();
      return remember(call?.idempotencyKey, () =>
        stampMember(world, venueId, memberFrom(world, venueId, customerId), by, now()),
      );
    },
    async ownerListLoyaltyScans(venueId, since) {
      await gate();
      accessOf(world, tokens);
      const from = since ? Date.parse(since) : -Infinity;
      return {
        items: world.scanLog
          .filter((row) => row.venueId === venueId && Date.parse(row.at) >= from)
          .map(({ venueId: _v, ...row }) => row),
      };
    },
    async ownerScanLoyaltyCard(venueId, body) {
      await gate();
      const by = staffName();
      const member = memberFrom(world, venueId, body.qrPayload);
      if (body.action === 'stamp') return stampMember(world, venueId, member, by, now());
      return rewardMember(world, venueId, member, by, now(), random);
    },
  } satisfies Partial<ApiClient>;
}
