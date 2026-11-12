import { blankVenue, LOYALTY_PROBLEMS, toWire } from '../features/loyalty/facts';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { LoyaltyCard, LoyaltyProgram } from '@/lib/api/types';
import { keepLoyalty, venueById } from './world';
import type { MockContext } from './mockContext';

/** Mock calls: the owner's loyalty programme, members, analytics and card scanning. */
export function mockOwnerLoyaltyCalls(ctx: MockContext) {
  const { world, now, random, gate, remember } = ctx;
  return {
    async ownerGetLoyalty(venueId) {
      await gate();
      const venue = venueById(world, venueId);
      const current = world.loyalty[venueId] ?? blankVenue(venueId, venue.currency);
      return toWire(current, { kind: 'programme' }) as LoyaltyProgram;
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
      return toWire(next, { kind: 'programme' }) as LoyaltyProgram;
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
      const scale = range === '7d' ? 1 : range === '90d' ? 6 : 3;
      return {
        range,
        enrolledCount: 76 * scale,
        stampsIssued: 312 * scale,
        rewardsRedeemed: 28 * scale,
        newEnrollments: 22 * scale,
        series: [
          { date: 'Mon', newEnrollments: 3, stampsIssued: 14, rewardsRedeemed: 1 },
          { date: 'Tue', newEnrollments: 5, stampsIssued: 20, rewardsRedeemed: 2 },
          { date: 'Wed', newEnrollments: 4, stampsIssued: 18, rewardsRedeemed: 1 },
          { date: 'Thu', newEnrollments: 8, stampsIssued: 28, rewardsRedeemed: 3 },
          { date: 'Fri', newEnrollments: 12, stampsIssued: 45, rewardsRedeemed: 5 },
          { date: 'Sat', newEnrollments: 16, stampsIssued: 62, rewardsRedeemed: 8 },
          { date: 'Sun', newEnrollments: 11, stampsIssued: 51, rewardsRedeemed: 6 },
        ],
      };
    },
    async ownerListLoyaltyCustomers(venueId, query) {
      await gate();
      let customers = [
        {
          id: 'cst_1',
          name: 'Kofi Mensah',
          phoneMasked: '024 *** 4567',
          email: 'kofi@example.com',
          stamps: 8,
          rewardsAvailable: 1,
          wantsOffers: true,
          lastStampAt: new Date(now() - 3600_000 * 2).toISOString(),
        },
        {
          id: 'cst_2',
          name: 'Abena Osei',
          phoneMasked: '020 *** 9821',
          email: 'abena@example.com',
          stamps: 4,
          rewardsAvailable: 0,
          wantsOffers: true,
          lastStampAt: new Date(now() - 3600_000 * 26).toISOString(),
        },
        {
          id: 'cst_3',
          name: 'Kwame Asante',
          phoneMasked: '055 *** 1122',
          email: null,
          stamps: 10,
          rewardsAvailable: 2,
          wantsOffers: false,
          lastStampAt: new Date(now() - 3600_000 * 72).toISOString(),
        },
        {
          id: 'cst_4',
          name: 'Yaa Konadu',
          phoneMasked: '024 *** 3344',
          email: 'yaa@example.com',
          stamps: 2,
          rewardsAvailable: 0,
          wantsOffers: true,
          lastStampAt: new Date(now() - 3600_000 * 120).toISOString(),
        },
      ];
      if (query?.wantsOffers) customers = customers.filter((c) => c.wantsOffers);
      if (query?.search) {
        const q = query.search.toLowerCase();
        customers = customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phoneMasked.includes(q) ||
            (c.email?.toLowerCase().includes(q) ?? false),
        );
      }
      return { items: customers, totalCount: customers.length };
    },
    async ownerScanLoyaltyCard(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const current = world.loyalty[venueId] ?? blankVenue(venueId, venue.currency);
      const card = toWire(current, {
        kind: 'member',
        memberId: 'mem_sample',
      }) as LoyaltyCard | null;
      if (!card) throw new ApiError(404, 'card_not_found', 'No loyalty card found for that code');
      if (body.action === 'stamp') {
        return {
          success: true,
          card,
          customerName: 'Kofi Mensah',
          stamps: 8,
          cooldownViolated: false,
          cooldownRemainingSeconds: 0,
          rewardUnlocked: false,
          message: '+1 Stamp recorded successfully.',
        };
      }
      return {
        success: true,
        card,
        customerName: 'Kofi Mensah',
        stamps: 0,
        cooldownViolated: false,
        cooldownRemainingSeconds: 0,
        rewardUnlocked: true,
        message: 'Reward Free Jollof redeemed successfully.',
      };
    },
  } satisfies Partial<ApiClient>;
}
