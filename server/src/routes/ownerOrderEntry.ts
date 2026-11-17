import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { promos } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import { saveOrder } from '../orders/orderStore.ts';
import { priceOrder } from '../orders/priceOrder.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import type { PromoRule } from '../shared/promos.ts';
import type { TaxSetup } from '../shared/types.ts';
import { menuOf, publicVenue, tableOf, venueRowById } from '../venues/venueData.ts';

const phone = z.string().regex(/^\+233\d{9}$/);
const orderBody = z.object({
  clientOrderId: z.string().uuid(),
  tableCode: z.string().min(1).max(12).nullish(),
  lines: z
    .array(z.object({ menuItemId: z.string().min(1), quantity: z.number().int().min(1).max(50), modifierOptionIds: z.array(z.string()).optional(), note: z.string().max(140).optional() }))
    .min(1)
    .max(60),
  note: z.string().max(200).optional(),
  promoCode: z.string().regex(/^[A-Z0-9]{3,20}$/).optional(),
  fulfilment: z
    .object({
      type: z.enum(['pickup', 'delivery']),
      contact: z.object({ name: z.string().min(1).max(60), phone }),
      address: z.string().max(200).optional(),
      location: z.object({ lat: z.number(), lng: z.number() }).optional(),
    })
    .optional(),
});

/** Staff placing orders (a table, the counter, the phone) and the old refund call. */
export function ownerOrderEntryRoutes(deps: OwnerDeps) {
  const app = new Hono();
  const { db } = deps;

  /**
   * An order staff take: priced from the menu like a guest's, for a table, a pickup or delivery
   * with the customer's details, or a plain counter order. Works before the menu is published, so
   * staff can try it first. Owners, managers and waiters; the kitchen doesn't take orders.
   */
  app.post('/owner/venues/:venueId/orders', async (c) => {
    const who = await signedIn(c, deps);
    const venueId = c.req.param('venueId');
    roleAt(who, venueId, ROLES.markPaid);
    const input = await body(c, orderBody);
    const row = await venueRowById(db, venueId);
    const tableCode = input.tableCode ?? null;
    if (tableCode && !(await tableOf(db, venueId, tableCode))) throw new Problem(422, 'validation', 'That table is not at this venue.');
    const [venue, menu, rules] = await Promise.all([publicVenue(db, row, deps.now()), menuOf(db, venueId), db.select().from(promos).where(eq(promos.venueId, venueId))]);
    const priced = priceOrder({
      items: menu.items,
      venue,
      promos: rules.filter((r) => !r.deletedAt).map((r) => ({ ...(r.rule as PromoRule), id: r.id, usageCount: r.usageCount, enabled: r.enabled, code: r.code })),
      tax: (row.tax as TaxSetup | null) ?? null,
      body: input,
      tableCode,
      now: deps.now(),
      counter: true,
    });
    const membership = who.memberships.find((m) => m.venueId === venueId);
    // The Idempotency-Key scope is the staff member, so a double tap saves one order.
    const order = await saveOrder(db, { venueId, guestSessionId: `staff:${membership?.id ?? who.user.id}`, clientOrderId: input.clientOrderId, tableCode, priced, now: deps.now() });
    return c.json(order, 201);
  });

  /**
   * The old split model's refund. Each venue now refunds in its own Paystack dashboard (Clarke,
   * 2026-11-08), and Cravins lists no transactions, so there is never one to refund here.
   */
  app.post('/owner/transactions/:transactionId/refund', async (c) => {
    await signedIn(c, deps);
    throw new Problem(404, 'not_found', 'Refund online payments from your Paystack dashboard.');
  });

  return app;
}
