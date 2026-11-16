import { Hono, type Context } from 'hono';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { idempotencyKeys, orderLines, orders, paymentSettings } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import type { Log } from '../log.ts';
import { orderById, orderFromRows } from '../orders/orderStore.ts';
import { meOf, roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import type { MediaStorage } from '../media/storage.ts';
import type { Paystack } from '../paystack.ts';
import { orderTransition, type OrderMove } from '../shared/orderMachine.ts';
import { checkManualPayments, checkPaystackKeys } from '../shared/payments.ts';
import type { ManualPayments, OrderStatus } from '../shared/types.ts';
import { paymentSettingsOf, venueRowById } from '../venues/venueData.ts';
import type { VenuePaystackStore } from '../venues/venuePaystack.ts';

export type OwnerRouteDeps = OwnerDeps & {
  /** Photo uploads (Supabase Storage). Null until the server has the storage key. */
  storage: MediaStorage | null;
  venueKeys: VenuePaystackStore;
  /** A Paystack client for a key being connected, before it is saved. */
  paystackClient: (secret: string) => Paystack;
  log: Log;
};

// Test keys only until Clarke switches live on (AGENTS.md rule 5, src/lib/features.ts).
const LIVE_PAYMENTS_ENABLED = false;

const STATUS = z.enum(['received', 'preparing', 'ready', 'served', 'cancelled']);
const MOVE: Partial<Record<OrderStatus, OrderMove>> = { preparing: 'start', ready: 'ready', served: 'serve', cancelled: 'cancel' };
const manualBody = z.object({
  cash: z.boolean(),
  cardMachine: z.boolean(),
  bankTransfer: z.object({
    enabled: z.boolean(),
    bankName: z.string().max(80).optional(),
    accountName: z.string().max(80).optional(),
    accountNumber: z.string().max(40).optional(),
  }),
  momo: z.object({
    enabled: z.boolean(),
    network: z.enum(['mtn', 'vod', 'atl']).optional(),
    number: z.string().optional(),
    name: z.string().max(80).optional(),
  }),
});
const feeBody = z.object({ enabled: z.boolean(), percent: z.number().int().min(1).max(100) });
const keysBody = z.object({ mode: z.enum(['test', 'live']), publicKey: z.string().max(200), secretKey: z.string().max(200) });

/** Owner and staff calls (api/openapi.yaml: auth /me, owner-payments, owner-orders). */
export function ownerRoutes(deps: OwnerRouteDeps) {
  const app = new Hono();
  const { db } = deps;

  app.get('/me', async (c) => c.json(await meOf(db, await signedIn(c, deps))));

  // ---- payment settings: owners only, because they decide where the money goes.
  const ownerOf = async (c: Context) => {
    const venueId = c.req.param('venueId') ?? '';
    roleAt(await signedIn(c, deps), venueId, ROLES.payments);
    await venueRowById(db, venueId);
    return venueId;
  };

  app.get('/owner/venues/:venueId/payment-settings', async (c) => c.json(await paymentSettingsOf(db, await ownerOf(c))));

  app.put('/owner/venues/:venueId/payment-settings/manual', async (c) => {
    const venueId = await ownerOf(c);
    const manual = (await body(c, manualBody)) as ManualPayments;
    const check = checkManualPayments(manual);
    if (!check.ok) throw new Problem(400, `manual_${check.field}_incomplete`, 'Add the details first.');
    await db.update(paymentSettings).set({ manual, updatedAt: new Date(deps.now()) }).where(eq(paymentSettings.venueId, venueId));
    return c.json(await paymentSettingsOf(db, venueId));
  });

  app.put('/owner/venues/:venueId/payment-settings/fees', async (c) => {
    const venueId = await ownerOf(c);
    const input = feeBody.safeParse(await c.req.json().catch(() => null));
    if (!input.success) throw new Problem(400, 'fee_percent_invalid', 'Pick a share from 1% to 100%.');
    await db.update(paymentSettings).set({ feePassing: input.data, updatedAt: new Date(deps.now()) }).where(eq(paymentSettings.venueId, venueId));
    return c.json(await paymentSettingsOf(db, venueId));
  });

  /**
   * Connecting checks the keys' shape, then asks Paystack with the secret key, and only then
   * stores it sealed. The key never appears in a reply or a log.
   */
  app.put('/owner/venues/:venueId/payment-settings/paystack', async (c) => {
    const venueId = await ownerOf(c);
    const input = await body(c, keysBody);
    const keys = { mode: input.mode, publicKey: input.publicKey.trim(), secretKey: input.secretKey.trim() };
    const shape = checkPaystackKeys(keys, LIVE_PAYMENTS_ENABLED);
    if (!shape.ok) throw new Problem(422, shape.code, 'Paystack did not accept these keys.');
    try {
      await deps.paystackClient(keys.secretKey).checkKey();
    } catch {
      throw new Problem(422, 'paystack_keys_invalid', 'Paystack did not accept this secret key. Copy it again from your Paystack dashboard.');
    }
    await deps.venueKeys.save(venueId, keys, deps.now());
    deps.log({ event: 'paystack_connected', venueId, mode: keys.mode });
    return c.json(await paymentSettingsOf(db, venueId));
  });

  app.delete('/owner/venues/:venueId/payment-settings/paystack', async (c) => {
    const venueId = await ownerOf(c);
    await deps.venueKeys.remove(venueId, deps.now());
    deps.log({ event: 'paystack_disconnected', venueId });
    return c.json(await paymentSettingsOf(db, venueId));
  });

  app.post('/owner/venues/:venueId/payment-settings/paystack/test', async (c) => {
    const venueId = await ownerOf(c);
    const checkedAt = new Date(deps.now()).toISOString();
    const venue = await deps.venueKeys.forVenueId(venueId);
    if (!venue) return c.json({ ok: false, checkedAt, message: 'Connect your Paystack account first.' });
    try {
      await venue.paystack.checkKey();
      return c.json({ ok: true, checkedAt });
    } catch {
      return c.json({ ok: false, checkedAt, message: 'Paystack refused the saved key. Connect again with your current keys.' });
    }
  });

  // ---- orders
  app.get('/owner/venues/:venueId/orders', async (c) => {
    const venueId = c.req.param('venueId');
    roleAt(await signedIn(c, deps), venueId, ROLES.orders);
    const wanted = (c.req.query('status') ?? '').split(',').filter(Boolean);
    const statuses = z.array(STATUS).safeParse(wanted);
    if (!statuses.success) throw new Problem(400, 'validation', 'Unknown order status.');
    const since = c.req.query('since');
    const until = c.req.query('until');
    const rows = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.venueId, venueId),
          statuses.data.length ? inArray(orders.status, statuses.data) : undefined,
          since ? gte(orders.createdAt, new Date(since)) : undefined,
          until ? lt(orders.createdAt, new Date(until)) : undefined,
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(300);
    const lines = rows.length ? await db.select().from(orderLines).where(inArray(orderLines.orderId, rows.map((r) => r.id))) : [];
    return c.json({ items: rows.map((row) => orderFromRows(row, lines.filter((l) => l.orderId === row.id))), nextCursor: null });
  });

  /** An order and the caller's role at its venue, if allowed. */
  const staffOrder = async (c: Context, allowed: typeof ROLES.orders) => {
    const who = await signedIn(c, deps);
    const found = await orderById(db, c.req.param('orderId') ?? '');
    if (!found) throw new Problem(404, 'order_not_found', 'We could not find that order.');
    return { found, role: roleAt(who, found.row.venueId, allowed) };
  };

  app.put('/owner/orders/:orderId/status', async (c) => {
    const { found, role } = await staffOrder(c, ROLES.moveOrder);
    const input = await body(c, z.object({ status: STATUS, cancelReason: z.string().max(200).optional() }));
    const move = MOVE[input.status];
    const next = move ? orderTransition(found.row.status, move, role) : null;
    if (!next || next !== input.status) throw new Problem(409, 'illegal_move', 'That status change is not allowed.');
    const at = new Date(deps.now());
    // Only moves from the status we read, so two staff tapping at once can't skip a step.
    const [moved] = await db
      .update(orders)
      .set({
        status: next,
        updatedAt: at,
        ...(next === 'ready' ? { readyAt: at } : {}),
        ...(next === 'served' ? { servedAt: at } : {}),
        ...(next === 'cancelled' ? { cancelReason: input.cancelReason?.trim() || null } : {}),
      })
      .where(and(eq(orders.id, found.row.id), eq(orders.status, found.row.status)))
      .returning();
    if (!moved) throw new Problem(409, 'illegal_move', 'Someone else just changed this order. Refresh and try again.');
    return c.json((await orderById(db, moved.id))?.order);
  });

  app.post('/owner/orders/:orderId/manual-payment', async (c) => {
    const { found } = await staffOrder(c, ROLES.markPaid);
    const input = await body(c, z.object({ method: z.enum(['cash', 'card_machine', 'bank_transfer', 'momo_merchant']) }));
    const key = c.req.header('Idempotency-Key');
    if (key) {
      const [seen] = await db.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.scope, `manual:${found.row.id}`), eq(idempotencyKeys.key, key)));
      if (seen) return c.json((await orderById(db, found.row.id))?.order);
    }
    // Already paid: nothing changes, so a double tap is harmless. The whole total is marked paid.
    await db.transaction(async (tx) => {
      const [paid] = await tx
        .update(orders)
        .set({ paidPesewas: sql`${orders.totalPesewas}`, paymentMethod: input.method, updatedAt: new Date(deps.now()) })
        .where(and(eq(orders.id, found.row.id), lt(orders.paidPesewas, orders.totalPesewas)))
        .returning({ id: orders.id });
      if (paid) await tx.update(orderLines).set({ paid: true }).where(eq(orderLines.orderId, found.row.id));
      if (key) await tx.insert(idempotencyKeys).values({ scope: `manual:${found.row.id}`, key, status: 200, body: {} }).onConflictDoNothing();
    });
    return c.json((await orderById(db, found.row.id))?.order);
  });

  return app;
}
