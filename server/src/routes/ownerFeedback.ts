import { Hono, type Context } from 'hono';
import { and, desc, eq, lte } from 'drizzle-orm';
import { z } from 'zod';
import { feedback, writtenReviews } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import { feedbackSummary } from '../shared/feedbackSummary.ts';
import type { FeedbackItem, WrittenReview } from '../shared/types.ts';

type ReviewRow = typeof writtenReviews.$inferSelect;
type NoteRow = typeof feedback.$inferSelect;

const reviewOf = (r: ReviewRow): WrittenReview => ({
  id: r.id,
  stars: r.stars,
  firstName: r.firstName,
  ...(r.text ? { text: r.text } : {}),
  highlights: r.highlights as WrittenReview['highlights'],
  reply: r.reply,
  createdAt: r.createdAt.toISOString(),
});
const noteOf = (n: NoteRow): FeedbackItem => ({
  id: n.id,
  venueId: n.venueId,
  sentiment: n.sentiment,
  score: n.score,
  text: n.text,
  photoUrl: n.photoUrl,
  contactName: n.contactName,
  contactPhone: n.contactPhone,
  archived: n.archived,
  visibleAfter: n.visibleAfter.toISOString(),
  createdAt: n.createdAt.toISOString(),
});

/** Reviews and guest notes for the owner (api/openapi.yaml owner reviews, feedback). */
export function ownerFeedbackRoutes(deps: OwnerDeps) {
  const app = new Hono();
  const { db } = deps;
  const managerAt = async (c: Context, venueId: string) => roleAt(await signedIn(c, deps), venueId, ROLES.menu);

  app.get('/owner/venues/:venueId/written-reviews', async (c) => {
    await managerAt(c, c.req.param('venueId'));
    const rows = await db.select().from(writtenReviews).where(eq(writtenReviews.venueId, c.req.param('venueId'))).orderBy(desc(writtenReviews.createdAt)).limit(300);
    return c.json({ items: rows.map(reviewOf) });
  });

  app.post('/owner/written-reviews/:writtenReviewId/reply', async (c) => {
    const [row] = await db.select().from(writtenReviews).where(eq(writtenReviews.id, c.req.param('writtenReviewId')));
    if (!row) throw new Problem(404, 'not_found', 'That review is gone.');
    await managerAt(c, row.venueId);
    const input = await body(c, z.object({ text: z.string().trim().min(1).max(400) }));
    const [saved] = await db.update(writtenReviews).set({ reply: input.text }).where(eq(writtenReviews.id, row.id)).returning();
    return c.json(reviewOf(saved!));
  });

  /** Notes still inside their privacy delay stay out of every list and answer. */
  const visibleNotes = (venueId: string) =>
    db
      .select()
      .from(feedback)
      .where(and(eq(feedback.venueId, venueId), lte(feedback.visibleAfter, new Date(deps.now()))))
      .orderBy(desc(feedback.createdAt))
      .limit(500);

  app.get('/owner/venues/:venueId/feedback', async (c) => {
    const venueId = c.req.param('venueId');
    await managerAt(c, venueId);
    const state = c.req.query('state') ?? 'new';
    const search = c.req.query('search')?.toLowerCase();
    const items = (await visibleNotes(venueId))
      .filter((n) => (state === 'new' ? !n.archived : state === 'archived' ? n.archived : true))
      .filter((n) => !search || n.text.toLowerCase().includes(search) || (n.contactPhone?.includes(search) ?? false));
    return c.json({ items: items.map(noteOf) });
  });

  app.patch('/owner/venues/:venueId/feedback/:feedbackId/archive', async (c) => {
    const venueId = c.req.param('venueId');
    await managerAt(c, venueId);
    const input = await body(c, z.object({ archived: z.boolean() }));
    const [saved] = await db
      .update(feedback)
      .set({ archived: input.archived })
      .where(and(eq(feedback.id, c.req.param('feedbackId')), eq(feedback.venueId, venueId)))
      .returning();
    if (!saved) throw new Problem(404, 'not_found', 'That note is gone.');
    return c.json(noteOf(saved));
  });

  /** "Ask about my feedback": a plain summary worked out from the notes (no AI service, no data sent out). */
  app.post('/owner/venues/:venueId/feedback/ask', async (c) => {
    const venueId = c.req.param('venueId');
    await managerAt(c, venueId);
    const input = await body(c, z.object({ question: z.string().trim().min(1).max(500) }));
    const notes = (await visibleNotes(venueId)).map(noteOf);
    return c.json({
      reply: feedbackSummary(notes, input.question),
      suggestions: notes.length ? ['What are my biggest complaints?', 'What are guests loving?', 'Summarise my notes'] : [],
    });
  });

  return app;
}
