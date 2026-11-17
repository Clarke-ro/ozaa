import { Hono } from 'hono';
import { and, count, desc, eq, gt, gte, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import { feedback, gameScores, writtenReviews } from '../db/schema.ts';
import { moodOf } from '../feedback/mood.ts';
import { body, Problem } from '../http/problem.ts';
import { venueRowBySlug, type VenueProfile } from '../venues/venueData.ts';
import { guestOf, type GuestDeps } from './guest.ts';

// Game tuning: every point is one tap that drops a plate, and nobody lands a plate faster than
// this. A score that would need quicker taps is refused as impossible.
const MIN_MS_PER_POINT = 200;
// Guest notes stay hidden from the owner this long, so a note can't be matched to whoever just
// sat at a table (contract: FeedbackItem.visibleAfter).
const FEEDBACK_DELAY_MS = 2 * 60 * 60 * 1000;

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

/** Reviews, private notes and the game (api/openapi.yaml guest extras). */
export function guestExtraRoutes(deps: GuestDeps) {
  const app = new Hono();
  const { db } = deps;

  /** Every guest gets the same thank-you: reviews are never routed by their stars. */
  app.post('/reviews', async (c) => {
    const guest = guestOf(c, deps);
    const input = await body(c, reviewBody);
    const id = `rev_${crypto.randomUUID().replaceAll('-', '')}`;
    await db.insert(writtenReviews).values({
      id,
      venueId: guest.venueId,
      orderId: input.orderId ?? null,
      stars: input.stars,
      // Guest sessions carry no name (Act 843).
      firstName: 'Guest',
      text: input.text || null,
      highlights: input.highlights ?? [],
      createdAt: new Date(deps.now()),
    });
    return c.json({ id, googleReviewUrl: null }, 201);
  });

  /** A private note to the manager. The phone is kept only if the guest chose to leave it. */
  app.post('/feedback', async (c) => {
    const guest = guestOf(c, deps);
    const input = await body(c, feedbackBody);
    const at = deps.now();
    await db.insert(feedback).values({
      id: `fbk_${crypto.randomUUID().replaceAll('-', '')}`,
      venueId: guest.venueId,
      ...moodOf(input.message),
      text: input.message,
      contactPhone: input.contactPhone ?? null,
      visibleAfter: new Date(at + FEEDBACK_DELAY_MS),
      createdAt: new Date(at),
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
    if (input.durationMs < input.score * MIN_MS_PER_POINT) {
      throw new Problem(422, 'score_not_possible', 'That score came too fast to be real.');
    }
    // runId is the key: a replayed save counts once.
    await db
      .insert(gameScores)
      .values({ runId: input.runId, venueId: row.id, guestSessionId: guest.sid, score: input.score, durationMs: input.durationMs, nickname: input.nickname ?? null, createdAt: new Date(deps.now()) })
      .onConflictDoNothing();
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(gameScores)
      .where(and(eq(gameScores.venueId, row.id), gte(gameScores.createdAt, weekStart(deps.now())), gt(gameScores.score, input.score)));
    // A stamp needs a loyalty card, and joining loyalty waits for the SMS provider. Until then a
    // score never earns one on the real server.
    return c.json({ rank: n < 50 ? n + 1 : null, stampEarned: false }, 201);
  });

  return app;
}

