import { Hono } from 'hono';
import { and, count, desc, eq, gt, gte, isNotNull, ne, or } from 'drizzle-orm';
import { z } from 'zod';
import { feedback, gameScores, orders, writtenReviews } from '../db/schema.ts';
import { moodOf } from '../feedback/mood.ts';
import { body, Problem } from '../http/problem.ts';
import { clientIp, slidingWindow } from '../http/rateLimit.ts';
import { venueRowBySlug, type VenueProfile } from '../venues/venueData.ts';
import { canSeeOrder, guestOf, type GuestDeps } from './guest.ts';
import { readLoyaltyToken } from '../guest/loyaltyToken.ts';
import type { GuestClaims } from '../guest/token.ts';
import { loadLoyalty, step } from '../loyalty/store.ts';
import { orderById } from '../orders/orderStore.ts';
import { ghanaPhone } from '../shared/brand.ts';
import type { Db } from '../db/client.ts';

// Game tuning: every point is one tap that drops a plate, and nobody lands a plate faster than
// this. A score that would need quicker taps is refused as impossible. A run longer than a
// guest session is refused too. Both numbers still come from the phone, so the leaderboard is
// only as honest as that, and a stamp needs a paid order as well.
const MIN_MS_PER_POINT = 200;
const MAX_RUN_MS = 12 * 60 * 60 * 1000;
const SCORES_PER_VISIT = 60;
const PAID_VISIT_MS = 24 * 60 * 60 * 1000;
// Guest notes stay hidden from the owner this long, so a note can't be matched to whoever just
// sat at a table (contract: FeedbackItem.visibleAfter).
const FEEDBACK_DELAY_MS = 2 * 60 * 60 * 1000;
// One visit can tell the manager a few things. More than that is the same note repeated.
const NOTES_PER_VISIT = 3;
// A whole restaurant can share one address, so this only stops a script, not a busy lunch.
const NOTES_PER_IP = 120;
const REVIEWS_PER_IP = 120;
const HOUR_MS = 60 * 60 * 1000;

const reviewBody = z.object({
  stars: z.number().int().min(1).max(5),
  highlights: z.array(z.enum(['food', 'service', 'speed', 'value', 'vibe', 'cleanliness'])).max(6).optional(),
  text: z.string().trim().max(1000).optional(),
  orderId: z.string().optional(),
});
const feedbackBody = z.object({ message: z.string().trim().min(3).max(1000), contactPhone: z.string().regex(/^\+233\d{9}$/).optional() });
const scoreBody = z.object({
  score: z.number().int().min(0).max(500),
  runId: z.string().uuid(),
  durationMs: z.number().int().min(0),
  nickname: z.string().trim().min(1).max(16).optional(),
});

/** Monday 00:00 UTC of this week (Ghana is UTC all year), when the leaderboard starts again. */
function weekStart(now: number): Date {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

function dayStart(now: number): Date {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isUniqueViolation(error: unknown): boolean {
  const texts: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i += 1) {
    if (current instanceof Error) texts.push(current.message);
    const code = (current as { code?: string }).code;
    if (code) texts.push(code);
    current = (current as { cause?: unknown }).cause;
  }
  const text = texts.join(' ');
  return text.includes('23505') || text.toLowerCase().includes('duplicate key');
}

/**
 * The order this review belongs to. A sent id must be one this guest can see. With no id, the
 * visit's own latest order is used, then an open order at the same table, so an older app that
 * does not send an id still works after the guest has ordered.
 */
async function orderForReview(db: Db, guest: GuestClaims, orderId: string | undefined): Promise<string> {
  const refused = () => new Problem(422, 'review_needs_order', 'Order something first, then leave a review.');
  if (orderId) {
    const found = await orderById(db, orderId);
    if (!found || found.row.status === 'cancelled' || !canSeeOrder(guest, found.row)) throw refused();
    return found.row.id;
  }
  const [own] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.venueId, guest.venueId), eq(orders.guestSessionId, guest.sid), ne(orders.status, 'cancelled')))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  if (own) return own.id;
  if (guest.tableCode) {
    const [shared] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.venueId, guest.venueId),
          eq(orders.tableCode, guest.tableCode),
          ne(orders.status, 'cancelled'),
          ne(orders.status, 'served'),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(1);
    if (shared) return shared.id;
  }
  throw refused();
}

/** Reviews, private notes and the game (api/openapi.yaml guest extras). */
export function guestExtraRoutes(deps: GuestDeps) {
  const app = new Hono();
  const { db } = deps;
  const notesPerIp = slidingWindow({ limit: NOTES_PER_IP, windowMs: HOUR_MS, now: deps.now });
  const reviewsPerIp = slidingWindow({ limit: REVIEWS_PER_IP, windowMs: HOUR_MS, now: deps.now });

  /** Every guest gets the same thank-you: reviews are never routed by their stars. */
  app.post('/reviews', async (c) => {
    const guest = guestOf(c, deps);
    // Per venue, because many phones can share one network address. 120 an hour is a script, not a lunch.
    if (!reviewsPerIp.hit(`${clientIp(c.req.header('x-forwarded-for'))}:${guest.venueId}`)) {
      throw new Problem(429, 'rate_limited', 'Too many reviews from this network. Try again later.');
    }
    const input = await body(c, reviewBody);
    const orderId = await orderForReview(db, guest, input.orderId);
    const [already] = await db.select({ id: writtenReviews.id }).from(writtenReviews).where(eq(writtenReviews.orderId, orderId)).limit(1);
    if (already) return c.json({ id: already.id, googleReviewUrl: null }, 201);
    const id = `rev_${crypto.randomUUID().replaceAll('-', '')}`;
    try {
      await db.insert(writtenReviews).values({
        id,
        venueId: guest.venueId,
        orderId,
        stars: input.stars,
        // Guest sessions carry no name (Act 843).
        firstName: 'Guest',
        text: input.text || null,
        highlights: input.highlights ?? [],
        createdAt: new Date(deps.now()),
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const [winner] = await db.select({ id: writtenReviews.id }).from(writtenReviews).where(eq(writtenReviews.orderId, orderId)).limit(1);
      if (!winner) throw error;
      return c.json({ id: winner.id, googleReviewUrl: null }, 201);
    }
    return c.json({ id, googleReviewUrl: null }, 201);
  });

  /** A private note to the manager. The phone is kept only if the guest chose to leave it. */
  app.post('/feedback', async (c) => {
    const guest = guestOf(c, deps);
    const input = await body(c, feedbackBody);
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(feedback)
      .where(and(eq(feedback.venueId, guest.venueId), eq(feedback.guestSessionId, guest.sid)));
    if (n >= NOTES_PER_VISIT) {
      throw new Problem(429, 'feedback_limit', 'The manager already has your notes from this visit.');
    }
    if (!notesPerIp.hit(`${clientIp(c.req.header('x-forwarded-for'))}:${guest.venueId}`)) {
      throw new Problem(429, 'rate_limited', 'Too many notes from this network. Try again later.');
    }
    const at = deps.now();
    await db.insert(feedback).values({
      id: `fbk_${crypto.randomUUID().replaceAll('-', '')}`,
      venueId: guest.venueId,
      ...moodOf(input.message),
      text: input.message,
      contactPhone: input.contactPhone ?? null,
      visibleAfter: new Date(at + FEEDBACK_DELAY_MS),
      createdAt: new Date(at),
      guestSessionId: guest.sid,
    });
    return c.body(null, 201);
  });

  /** This week's top 5 named scores, one per nickname. Unnamed scores count for rank only. */
  app.get('/venues/:slug/game/leaderboard', async (c) => {
    const row = await venueRowBySlug(db, c.req.param('slug'));
    const rows = await db
      .select({ nickname: gameScores.nickname, score: gameScores.score })
      .from(gameScores)
      .where(and(eq(gameScores.venueId, row.id), gte(gameScores.createdAt, weekStart(deps.now())), isNotNull(gameScores.nickname)))
      .orderBy(desc(gameScores.score))
      .limit(100);
    const best: { nickname: string; score: number }[] = [];
    for (const r of rows) if (!best.some((b) => b.nickname === r.nickname)) best.push({ nickname: r.nickname!, score: r.score });
    return c.json({
      period: 'week',
      entries: best.slice(0, 5).map((entry, i) => ({ rank: i + 1, ...entry })),
      stampRule: (row.profile as VenueProfile).game ?? { enabled: false, minScore: 15 },
    });
  });

  app.post('/venues/:slug/game/scores', async (c) => {
    const guest = guestOf(c, deps);
    const row = await venueRowBySlug(db, c.req.param('slug'));
    if (row.id !== guest.venueId) throw new Problem(404, 'venue_not_found', 'Play from this venue’s page.');
    const input = await body(c, scoreBody);
    if (input.durationMs > MAX_RUN_MS || input.durationMs < input.score * MIN_MS_PER_POINT) {
      throw new Problem(422, 'score_not_possible', 'That score does not look like a real round.');
    }
    const [{ played } = { played: 0 }] = await db
      .select({ played: count() })
      .from(gameScores)
      .where(and(eq(gameScores.guestSessionId, guest.sid), gte(gameScores.createdAt, dayStart(deps.now()))));
    if (played >= SCORES_PER_VISIT) throw new Problem(429, 'rate_limited', 'Too many scores from this visit. Try again tomorrow.');
    // runId is the key: a replayed save counts once.
    await db
      .insert(gameScores)
      .values({ runId: input.runId, venueId: row.id, guestSessionId: guest.sid, score: input.score, durationMs: input.durationMs, nickname: input.nickname ?? null, createdAt: new Date(deps.now()) })
      .onConflictDoNothing();
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(gameScores)
      .where(and(eq(gameScores.venueId, row.id), gte(gameScores.createdAt, weekStart(deps.now())), gt(gameScores.score, input.score)));
    // A win earns a stamp only for a guest with a card here (their loyalty token rides beside the
    // guest token), only when the venue's rule is on, and at most once a day: the shared rules decide.
    // The score itself is whatever the phone says, so the stamp also needs a paid order from this
    // visit or this card in the last day. Playing while you wait still saves the score; the stamp
    // lands on a round sent after the bill is paid.
    let stampEarned = false;
    const phone = deps.loyaltyKey ? readLoyaltyToken(deps.loyaltyKey, c.req.header('X-Loyalty-Token'), deps.now()) : null;
    if (phone) {
      const game = (row.profile as VenueProfile).game ?? { enabled: false, minScore: 15 };
      stampEarned = await db.transaction(async (tx) => {
        const before = await loadLoyalty(tx, row.id, row.currency, { phone });
        const member = Object.values(before.members)[0];
        if (!member || !game.enabled || input.score < game.minScore) return false;
        const since = new Date(deps.now() - PAID_VISIT_MS);
        const [paid] = await tx
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              eq(orders.venueId, row.id),
              gt(orders.paidPesewas, 0),
              ne(orders.status, 'cancelled'),
              gte(orders.createdAt, since),
              or(eq(orders.guestSessionId, guest.sid), eq(orders.loyaltyMemberId, member.id)),
            ),
          )
          .limit(1);
        if (!paid) return false;
        const command = { type: 'game_win' as const, phone: ghanaPhone(phone), runId: input.runId, score: input.score, minScore: game.minScore, enabled: game.enabled };
        return (await step(tx, before, command, deps.now())).effect === 'posted';
      });
    }
    return c.json({ rank: n < 50 ? n + 1 : null, stampEarned }, 201);
  });

  return app;
}
