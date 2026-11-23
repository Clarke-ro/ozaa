import { blankVenue, LOYALTY_PROBLEMS, samplePhone, toWire } from '../features/loyalty/facts';
import { ghanaPhone, isGhanaPhone } from '@/lib/brand';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { LoyaltyCard, LoyaltyProgram } from '@/lib/api/types';
import { saveScore, weekBoard, weekStart, type ScoreRow } from '../features/game/leaderboard';
import { DEMO_BOARD } from './demo';
import { keepLoyalty, nextId, venueBySlug } from './world';
import { loyaltyOf, sessionOf } from './mockRules';
import type { MockContext } from './mockContext';

/** Mock calls: a guest's loyalty card, reviews, the game and feedback. */
export function mockGuestExtraCalls(ctx: MockContext) {
  const { world, tokens, now, random, gate, remember } = ctx;
  // Rounds played on this mock, per venue id. The demo's sample players are mixed into the board.
  const scores = new Map<string, ScoreRow[]>();
  return {
    async getVenueLoyaltyProgram(slug) {
      await gate();
      const venue = venueBySlug(world, slug);
      const current = world.loyalty[venue.id] ?? blankVenue(venue.id, venue.currency);
      return toWire(current, { kind: 'programme' }) as LoyaltyProgram;
    },
    async getMyLoyaltyCard(slug) {
      await gate();
      const row = loyaltyOf(world, tokens);
      const venue = venueBySlug(world, slug);
      const current = world.loyalty[venue.id] ?? blankVenue(venue.id, venue.currency);
      const wire = toWire(current, { kind: 'card', phone: samplePhone(row.phone) });
      if (!wire) {
        const problem = LOYALTY_PROBLEMS.not_a_member;
        throw new ApiError(problem.status, 'not_a_member', problem.title);
      }
      return wire as LoyaltyCard;
    },
    async joinLoyalty(slug, body) {
      await gate();
      const row = loyaltyOf(world, tokens);
      const venue = venueBySlug(world, slug);
      const phone = samplePhone(row.phone);
      const { venue: next } = keepLoyalty(
        world,
        venue.id,
        {
          type: 'join',
          phone,
          firstName: body.firstName,
          birthdayMonthDay: body.birthdayMonthDay,
          consent: body.consent,
          random,
        },
        new Date(now()).toISOString(),
      );
      return toWire(next, { kind: 'card', phone }) as LoyaltyCard;
    },
    async leaveLoyalty(slug) {
      await gate();
      const row = loyaltyOf(world, tokens);
      const venue = venueBySlug(world, slug);
      keepLoyalty(
        world,
        venue.id,
        { type: 'leave', phone: samplePhone(row.phone) },
        new Date(now()).toISOString(),
      );
    },
    async redeemReward(slug, body, call) {
      await gate();
      return remember(call.idempotencyKey, () => {
        const row = loyaltyOf(world, tokens);
        const venue = venueBySlug(world, slug);
        const phone = samplePhone(row.phone);
        const { venue: next } = keepLoyalty(
          world,
          venue.id,
          { type: 'open_claim', phone, rewardId: body.rewardId, random },
          new Date(now()).toISOString(),
        );
        return toWire(next, { kind: 'card', phone }) as LoyaltyCard;
      });
    },
    async createReview(body) {
      await gate();
      const session = sessionOf(world, tokens);
      const venue = venueBySlug(world, session.slug);
      const id = nextId(world, 'rev');
      // Stored so it shows on the owner's Reviews page. Guest sessions carry no name (Act 843).
      world.written.push({
        id,
        venueId: venue.id,
        stars: body.stars,
        firstName: 'Guest',
        text: body.text,
        highlights: body.highlights,
        createdAt: new Date(now()).toISOString(),
        reply: null,
      });
      // Reviews are not routed by stars: every guest gets the same reply.
      return { id, googleReviewUrl: null };
    },
    async getLeaderboard(slug) {
      await gate();
      venueBySlug(world, slug);
      const venue = venueBySlug(world, slug);
      return {
        period: 'week',
        entries: weekBoard(scores.get(venue.id) ?? [], now(), DEMO_BOARD),
        stampRule: venue.game ?? { enabled: false, minScore: 15 },
      };
    },
    async submitScore(slug, body) {
      await gate();
      const venue = venueBySlug(world, slug);
      sessionOf(world, tokens);
      const rows = saveScore(scores.get(venue.id) ?? [], {
        runId: body.runId,
        visit: tokens.guest() ?? '',
        nickname: body.nickname ?? null,
        score: body.score,
        at: now(),
      });
      scores.set(venue.id, rows);
      // Like the server: this week's rounds that beat it, named or not; outside the top 50 is null.
      const since = weekStart(now());
      const ahead = rows.filter((row) => row.at >= since && row.score > body.score).length;
      const target = venue.game?.minScore ?? 15;
      const loyaltyToken = tokens.loyalty?.() ?? tokens.access();
      const loyalty = loyaltyToken ? world.access.get(loyaltyToken) : undefined;
      let stampEarned = Boolean(venue.game?.enabled) && body.score >= target;
      if (loyalty?.purpose === 'guest_loyalty' && isGhanaPhone(loyalty.phone)) {
        const step = keepLoyalty(
          world,
          venue.id,
          {
            type: 'game_win',
            phone: ghanaPhone(loyalty.phone),
            runId: body.runId,
            score: body.score,
            minScore: target,
            enabled: Boolean(venue.game?.enabled),
          },
          new Date(now()).toISOString(),
        );
        stampEarned = step.effect === 'posted';
      }
      return { rank: ahead < 50 ? ahead + 1 : null, stampEarned };
    },
    async sendFeedback(body) {
      await gate();
      const session = sessionOf(world, tokens);
      const venue = venueBySlug(world, session.slug);
      const created = now();
      world.feedback.push({
        id: nextId(world, 'fbk'),
        venueId: venue.id,
        // The real server scores the note's mood; the mock files every new note as neutral.
        sentiment: 'neutral',
        score: 3,
        text: body.message,
        photoUrl: null,
        contactName: null,
        contactPhone: body.contactPhone ?? null,
        archived: false,
        // Held back two hours so a guest is not identified by when they sat down.
        visibleAfter: new Date(created + 2 * 3600_000).toISOString(),
        createdAt: new Date(created).toISOString(),
      });
    },
  } satisfies Partial<ApiClient>;
}
