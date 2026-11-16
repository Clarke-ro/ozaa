import { Hono, type Context } from 'hono';
import { and, desc, eq, gte, ne } from 'drizzle-orm';
import { z } from 'zod';
import { idempotencyKeys, waiterCalls } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import { applyCallUpdate, isInQueue } from '../shared/callUpdate.ts';
import type { WaiterCall } from '../shared/types.ts';
import { guestOf, type GuestDeps } from './guest.ts';

type Row = typeof waiterCalls.$inferSelect;
const iso = (date: Date | null) => date?.toISOString() ?? null;

/** A database row as the contract's WaiterCall. */
function callFromRow(row: Row): WaiterCall {
  return {
    id: row.id,
    tableCode: row.tableCode,
    reason: row.reason,
    ...(row.note ? { note: row.note } : {}),
    status: row.status,
    staffFirstName: row.staffFirstName,
    reply: row.reply,
    createdAt: row.createdAt.toISOString(),
    acknowledgedAt: iso(row.acknowledgedAt),
    resolvedAt: iso(row.resolvedAt),
    repliedAt: iso(row.repliedAt),
    snoozedUntil: iso(row.snoozedUntil),
  };
}

const at = (text: string | null | undefined) => (text ? new Date(text) : null);

const callBody = z.object({
  reason: z.enum(['water', 'bill', 'cutlery', 'order_more', 'clean_table', 'other']),
  note: z.string().max(140).optional(),
});
const updateBody = z
  .object({
    status: z.enum(['acknowledged', 'resolved']).optional(),
    reply: z.string().trim().min(1).max(80).optional(),
    snoozeMinutes: z.number().int().min(1).max(10).optional(),
  })
  .refine((u) => u.status !== undefined || u.reply !== undefined || u.snoozeMinutes !== undefined);

/** "Call the waiter" (api/openapi.yaml waiter-calls, owner waiter-calls). */
export function waiterRoutes(deps: GuestDeps & OwnerDeps) {
  const app = new Hono();
  const { db } = deps;

  /**
   * A guest at a table calls staff. A table has one open call at a time: calling again while
   * one is open changes its reason, so a guest tapping twice doesn't fill the queue.
   */
  app.post('/waiter-calls', async (c) => {
    const guest = guestOf(c, deps);
    if (!guest.tableCode) throw new Problem(400, 'validation', 'Scan the code on your table first.');
    const input = await body(c, callBody);
    const key = c.req.header('Idempotency-Key');
    const scope = `call:${guest.sid}`;
    const id = await db.transaction(async (tx) => {
      if (key) {
        const [seen] = await tx.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key)));
        if (seen) return (seen.body as { id: string }).id;
      }
      const [open] = await tx
        .select()
        .from(waiterCalls)
        .where(and(eq(waiterCalls.venueId, guest.venueId), eq(waiterCalls.tableCode, guest.tableCode!), ne(waiterCalls.status, 'resolved')));
      let callId: string;
      if (open) {
        await tx.update(waiterCalls).set({ reason: input.reason, note: input.note ?? null }).where(eq(waiterCalls.id, open.id));
        callId = open.id;
      } else {
        callId = `wcl_${crypto.randomUUID().replaceAll('-', '')}`;
        await tx.insert(waiterCalls).values({
          id: callId,
          venueId: guest.venueId,
          tableCode: guest.tableCode!,
          reason: input.reason,
          note: input.note ?? null,
          guestSessionId: guest.sid,
          createdAt: new Date(deps.now()),
        });
      }
      if (key) await tx.insert(idempotencyKeys).values({ scope, key, status: 201, body: { id: callId } });
      return callId;
    });
    const [row] = await db.select().from(waiterCalls).where(eq(waiterCalls.id, id));
    return c.json(callFromRow(row!), 201);
  });

  /** The guest's view: "Kwesi is on the way". Only for the table that made the call. */
  app.get('/waiter-calls/:waiterCallId', async (c) => {
    const guest = guestOf(c, deps);
    const [row] = await db.select().from(waiterCalls).where(eq(waiterCalls.id, c.req.param('waiterCallId')));
    if (!row || row.venueId !== guest.venueId || row.tableCode !== guest.tableCode) {
      throw new Problem(404, 'not_found', 'That call has finished.');
    }
    const { snoozedUntil: _hidden, ...call } = callFromRow(row);
    return c.json(call);
  });

  app.get('/owner/venues/:venueId/waiter-calls', async (c) => {
    const venueId = c.req.param('venueId');
    roleAt(await signedIn(c, deps), venueId, ROLES.orders);
    const open = c.req.query('open') !== 'false';
    const since = c.req.query('since');
    const rows = await db
      .select()
      .from(waiterCalls)
      .where(
        and(
          eq(waiterCalls.venueId, venueId),
          open ? ne(waiterCalls.status, 'resolved') : since ? gte(waiterCalls.createdAt, new Date(since)) : undefined,
        ),
      )
      .orderBy(desc(waiterCalls.createdAt))
      .limit(200);
    const now = deps.now();
    const calls = rows.map(callFromRow).filter((call) => !open || isInQueue(call, now));
    return c.json({ items: calls });
  });

  /** "On my way", a reply (which resolves it) or a snooze, by the staff member who tapped it. */
  app.patch('/owner/waiter-calls/:waiterCallId', async (c: Context) => {
    const who = await signedIn(c, deps);
    const [row] = await db.select().from(waiterCalls).where(eq(waiterCalls.id, c.req.param('waiterCallId') ?? ''));
    if (!row) throw new Problem(404, 'not_found', 'That call has finished.');
    roleAt(who, row.venueId, ROLES.markPaid);
    const input = updateBody.safeParse(await c.req.json().catch(() => null));
    if (!input.success) throw new Problem(400, 'validation', 'Send a status, a reply or a snooze.');
    const next = applyCallUpdate(callFromRow(row), input.data, who.user.firstName, deps.now());
    if (!next) throw new Problem(409, 'illegal_move', 'That call has already moved on.');
    const membership = who.memberships.find((m) => m.venueId === row.venueId);
    // Only from the status we read, so two staff tapping "On my way" at once can't both win.
    const [saved] = await db
      .update(waiterCalls)
      .set({
        status: next.status,
        staffFirstName: next.staffFirstName ?? null,
        staffMembershipId: next.status !== row.status ? (membership?.id ?? null) : row.staffMembershipId,
        reply: next.reply ?? null,
        acknowledgedAt: at(next.acknowledgedAt),
        resolvedAt: at(next.resolvedAt),
        repliedAt: at(next.repliedAt),
        snoozedUntil: at(next.snoozedUntil),
      })
      .where(and(eq(waiterCalls.id, row.id), eq(waiterCalls.status, row.status)))
      .returning();
    if (!saved) throw new Problem(409, 'illegal_move', 'Someone else just answered this call.');
    return c.json(callFromRow(saved));
  });

  return app;
}
