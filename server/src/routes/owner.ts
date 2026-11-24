import { Hono, type Context } from 'hono';
import { and, eq, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { idempotencyKeys, orderLines, orders, paymentSettings } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import type { Log } from '../log.ts';
import { stampPaidOrder } from '../loyalty/paidOrder.ts';
import { listOwnerOrders } from '../orders/listOrders.ts';
import { releaseExpiredHolds } from '../orders/orderInventory.ts';
import { cancelOrder, orderById } from '../orders/orderStore.ts';
import { PaystackError } from '../paystack.ts';
import { meOf, roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import type { MediaStorage } from '../media/storage.ts';
import type { ClerkAdmin } from '../owner/clerkAdmin.ts';
import type { Paystack } from '../paystack.ts';
import { moveFor, orderTransition } from '../shared/orderMachine.ts';
import { checkManualPayments, checkPaystackKeys } from '../shared/payments.ts';
import type { ManualPayments, OrderStatus } from '../shared/types.ts';
import { paymentSettingsOf, venueRowById } from '../venues/venueData.ts';
import type { VenueChowdeckStore } from '../venues/venueChowdeck.ts';
import type { VenuePaystackStore } from '../venues/venuePaystack.ts';

export type OwnerRouteDeps = OwnerDeps & {
  /** Photo uploads (Supabase Storage). Null until the server has the storage key. */
  storage: MediaStorage | null;
  /** Creates staff sign-ins and signs people out (Clerk). Null without CLERK_SECRET_KEY. */
  clerkAdmin: ClerkAdmin | null;
  /** The real app's address, for table QR codes (SITE_URL). */
  siteUrl: string;
  venueKeys: VenuePaystackStore;
  /** Each venue's Chowdeck channel and its sealed keys (docs/connectors-plan.md). */
  chowdeckKeys: VenueChowdeckStore;
  /** A Paystack client for a key being connected, before it is saved. */
  paystackClient: (secret: string) => Paystack;
  log: Log;
};

// Test keys only until Clarke switches live on (AGENTS.md rule 5, src/lib/features.ts).
const LIVE_PAYMENTS_ENABLED = false;

const STATUS = z.enum(['received', 'accepted', 'preparing', 'ready', 'served', 'cancelled']);
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
const keysBody = z.object({
  mode: z.enum(['test', 'live']),
  publicKey: z.string().max(200),
  secretKey: z.string().max(200),
});

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

  app.get('/owner/venues/:venueId/payment-settings', async (c) =>
    c.json(await paymentSettingsOf(db, await ownerOf(c))),
  );

  app.put('/owner/venues/:venueId/payment-settings/manual', async (c) => {
    const venueId = await ownerOf(c);
    const manual = (await body(c, manualBody)) as ManualPayments;
    const check = checkManualPayments(manual);
    if (!check.ok)
      throw new Problem(400, `manual_${check.field}_incomplete`, 'Add the details first.');
    await db
      .update(paymentSettings)
      .set({ manual, updatedAt: new Date(deps.now()) })
      .where(eq(paymentSettings.venueId, venueId));
    return c.json(await paymentSettingsOf(db, venueId));
  });

  app.put('/owner/venues/:venueId/payment-settings/fees', async (c) => {
    const venueId = await ownerOf(c);
    const input = feeBody.safeParse(await c.req.json().catch(() => null));
    if (!input.success)
      throw new Problem(400, 'fee_percent_invalid', 'Pick a share from 1% to 100%.');
    await db
      .update(paymentSettings)
      .set({ feePassing: input.data, updatedAt: new Date(deps.now()) })
      .where(eq(paymentSettings.venueId, venueId));
    return c.json(await paymentSettingsOf(db, venueId));
  });

  /**
   * Connecting checks the keys' shape, then asks Paystack with the secret key, and only then
   * stores it sealed. The key never appears in a reply or a log.
   */
  app.put('/owner/venues/:venueId/payment-settings/paystack', async (c) => {
    const venueId = await ownerOf(c);
    const input = await body(c, keysBody);
    const keys = {
      mode: input.mode,
      publicKey: input.publicKey.trim(),
      secretKey: input.secretKey.trim(),
    };
    const shape = checkPaystackKeys(keys, LIVE_PAYMENTS_ENABLED);
    if (!shape.ok) throw new Problem(422, shape.code, 'Paystack did not accept these keys.');
    try {
      await deps.paystackClient(keys.secretKey).checkKey();
    } catch (error) {
      if (error instanceof PaystackError && error.httpStatus === 503) {
        throw new Problem(503, 'paystack_unavailable', 'Paystack took too long. Try again.');
      }
      throw new Problem(
        422,
        'paystack_keys_invalid',
        'Paystack did not accept this secret key. Copy it again from your Paystack dashboard.',
      );
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
    if (!venue)
      return c.json({ ok: false, checkedAt, message: 'Connect your Paystack account first.' });
    try {
      await venue.paystack.checkKey();
      return c.json({ ok: true, checkedAt });
    } catch (error) {
      const slow = error instanceof PaystackError && error.httpStatus === 503;
      return c.json({
        ok: false,
        checkedAt,
        message: slow
          ? 'Paystack took too long. Try again.'
          : 'Paystack refused the saved key. Connect again with your current keys.',
      });
    }
  });

  // ---- orders
  app.get('/owner/venues/:venueId/orders', async (c) => {
    const venueId = c.req.param('venueId');
    roleAt(await signedIn(c, deps), venueId, ROLES.orders);
    const wanted = (c.req.query('status') ?? '').split(',').filter(Boolean);
    const statuses = z.array(STATUS).safeParse(wanted);
    if (!statuses.success) throw new Problem(400, 'validation', 'Unknown order status.');
    await releaseExpiredHolds(db, deps.now(), venueId);
    const since = c.req.query('since');
    const until = c.req.query('until');
    const updatedSince = c.req.query('updatedSince');
    // A date that doesn't parse would reach Postgres as "Invalid Date" and fail as a 500.
    for (const value of [since, until, updatedSince]) {
      if (value !== undefined && Number.isNaN(Date.parse(value)))
        throw new Problem(400, 'validation', 'Use a date like 2026-11-17T09:00:00Z.');
    }
    const items = await listOwnerOrders(db, venueId, {
      statuses: statuses.data,
      since: since ? new Date(since) : undefined,
      until: until ? new Date(until) : undefined,
      updatedSince: updatedSince ? new Date(updatedSince) : undefined,
      live: c.req.query('live') === 'true',
    });
    return c.json({ items, nextCursor: null });
  });

  /** An order, the caller's role at its venue, and their membership there, if allowed. */
  const staffOrder = async (c: Context, allowed: typeof ROLES.orders) => {
    const who = await signedIn(c, deps);
    const found = await orderById(db, c.req.param('orderId') ?? '');
    if (!found) throw new Problem(404, 'order_not_found', 'We could not find that order.');
    const role = roleAt(who, found.row.venueId, allowed);
    const membershipId = who.memberships.find((m) => m.venueId === found.row.venueId)?.id ?? null;
    return { found, role, membershipId };
  };

  app.get('/owner/orders/:orderId', async (c) => {
    const { found } = await staffOrder(c, ROLES.orders);
    return c.json(found.order);
  });

  app.put('/owner/orders/:orderId/status', async (c) => {
    const { found, role, membershipId } = await staffOrder(c, ROLES.moveOrder);
    const input = await body(
      c,
      z.object({ status: STATUS, cancelReason: z.string().max(200).optional() }),
    );
    const move = moveFor(input.status);
    const next = move ? orderTransition(found.row.status, move, role) : null;
    if (!next || next !== input.status)
      throw new Problem(409, 'illegal_move', 'That status change is not allowed.');
    if (next === 'cancelled') {
      const order = await cancelOrder(db, {
        id: found.row.id,
        fromStatus: found.row.status,
        reason: input.cancelReason?.trim() || null,
        byMembershipId: membershipId,
        now: deps.now(),
      });
      if (!order) {
        throw new Problem(
          409,
          'illegal_move',
          'Someone else just changed this order. Refresh and try again.',
        );
      }
      return c.json(order);
    }
    const at = new Date(deps.now());
    // Only moves from the status we read, so two staff tapping at once can't skip a step.
    const [moved] = await db
      .update(orders)
      .set({
        status: next,
        updatedAt: at,
        ...(next === 'ready' ? { readyAt: at } : {}),
        ...(next === 'served' ? { servedAt: at } : {}),
      })
      .where(and(eq(orders.id, found.row.id), eq(orders.status, found.row.status)))
      .returning();
    if (!moved)
      throw new Problem(
        409,
        'illegal_move',
        'Someone else just changed this order. Refresh and try again.',
      );
    return c.json((await orderById(db, moved.id))?.order);
  });

  app.post('/owner/orders/:orderId/manual-payment', async (c) => {
    const { found, membershipId } = await staffOrder(c, ROLES.markPaid);
    const input = await body(
      c,
      z.object({ method: z.enum(['cash', 'card_machine', 'bank_transfer', 'momo_merchant']) }),
    );
    const key = c.req.header('Idempotency-Key');
    if (key) {
      const [seen] = await db
        .select()
        .from(idempotencyKeys)
        .where(
          and(eq(idempotencyKeys.scope, `manual:${found.row.id}`), eq(idempotencyKeys.key, key)),
        );
      if (seen) return c.json((await orderById(db, found.row.id))?.order);
    }
    // Already paid: nothing changes, so a double tap is harmless. The whole total is marked paid.
    // The first person to mark it keeps the credit: the update only matches while money is still owed.
    const at = new Date(deps.now());
    await db.transaction(async (tx) => {
      const [paid] = await tx
        .update(orders)
        .set({
          paidPesewas: sql`${orders.totalPesewas}`,
          paymentMethod: input.method,
          paidByMembershipId: membershipId,
          paidAt: at,
          updatedAt: at,
        })
        .where(and(eq(orders.id, found.row.id), lt(orders.paidPesewas, orders.totalPesewas)))
        .returning({ id: orders.id });
      if (paid) {
        await tx.update(orderLines).set({ paid: true }).where(eq(orderLines.orderId, found.row.id));
        // Paid in cash or the like still counts as a visit for the guest's loyalty card.
        await stampPaidOrder(tx, found.row.id, deps.now());
      }
      if (key)
        await tx
          .insert(idempotencyKeys)
          .values({ scope: `manual:${found.row.id}`, key, status: 200, body: {} })
          .onConflictDoNothing();
    });
    return c.json((await orderById(db, found.row.id))?.order);
  });

  return app;
}
