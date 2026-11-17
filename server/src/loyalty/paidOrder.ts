import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { loyaltyMembers, loyaltyPrograms, orders, venues } from '../db/schema.ts';
import { readLoyaltyToken } from '../guest/loyaltyToken.ts';
import { minor } from '../shared/loyaltyFacts.ts';
import { loadLoyalty, step } from './store.ts';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * The card an order belongs to: the guest's loyalty token (X-Loyalty-Token) names a phone, and
 * the order keeps only that member's id at this venue. Null without a card here.
 */
export async function memberForOrder(db: Db, key: Buffer | undefined, token: string | undefined, venueId: string, now: number): Promise<string | null> {
  const phone = key ? readLoyaltyToken(key, token, now) : null;
  if (!phone) return null;
  const [member] = await db
    .select({ id: loyaltyMembers.id })
    .from(loyaltyMembers)
    .where(and(eq(loyaltyMembers.venueId, venueId), eq(loyaltyMembers.phone, phone), isNull(loyaltyMembers.leftAt)));
  return member?.id ?? null;
}

/**
 * Once an order is fully paid, its card gets the stamp (or points) for the visit, when the venue
 * stamps paid orders. Runs inside the payment's transaction. The shared rules key the stamp by
 * order id, so a webhook and a verify, or a second tap, never stamp twice.
 */
export async function stampPaidOrder(tx: Tx, orderId: string, now: number): Promise<void> {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
  if (!order?.loyaltyMemberId || order.paidPesewas < order.totalPesewas) return;
  const [programme] = await tx.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.venueId, order.venueId));
  if ((programme?.programme as { stampOnPaidOrder?: boolean } | undefined)?.stampOnPaidOrder === false) return;
  const [venue] = await tx.select({ currency: venues.currency }).from(venues).where(eq(venues.id, order.venueId));
  const before = await loadLoyalty(tx, order.venueId, venue?.currency ?? 'GHS', { memberId: order.loyaltyMemberId });
  const member = before.members[order.loyaltyMemberId];
  if (!member) return;
  await step(
    tx,
    before,
    { type: 'paid_visit', orderId: order.id, amountMinor: minor(order.totalPesewas), currency: before.programme.currency, paid: true, loyaltyPhone: member.phone, momoPhone: null },
    now,
  );
}
