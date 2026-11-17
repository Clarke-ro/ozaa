import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { orders } from '../db/schema.ts';
import { signLoyaltyToken } from '../guest/loyaltyToken.ts';
import { as, OWNER, ownerSetup, WAITER } from '../routes/ownerTestSetup.ts';
import { TEST_KEY } from '../routes/testHelpers.ts';

const loyalty = signLoyaltyToken(TEST_KEY, '+233241234567', Date.parse('2027-01-01'));
const consent = { loyalty: true, marketing: false, textVersion: 'consent-2026-10-v1' };

async function setup() {
  const app = await ownerSetup();
  await app.call('PUT', '/venues/mamas-kitchen/loyalty/me', { consent }, { Authorization: `Bearer ${loyalty}` });
  const guest = { Authorization: `Bearer ${(await app.call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '6' })).json.guestToken}` };
  const dish = (await app.call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const order = async (withCard: boolean) =>
    (await app.call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] }, { ...guest, ...(withCard ? { 'X-Loyalty-Token': loyalty } : {}) })).json;
  const stamps = async () => (await app.call('GET', '/venues/mamas-kitchen/loyalty/me', undefined, { Authorization: `Bearer ${loyalty}` })).json.member.facts.filter((f: { kind: string }) => f.kind === 'earn').length;
  const markPaid = (id: string) => app.call('POST', `/owner/orders/${id}/manual-payment`, { method: 'cash' }, as('user_waiter', WAITER));
  return { ...app, order, stamps, markPaid };
}

test('an order placed with the loyalty card earns a stamp when it is paid, once', async () => {
  const { db, order, stamps, markPaid } = await setup();
  const mine = await order(true);
  const [row] = await db.select().from(orders).where(eq(orders.id, mine.id));
  assert.ok(row!.loyaltyMemberId, 'the order keeps the card id');
  assert.ok(!JSON.stringify(row).includes('241234567'), 'never the phone');
  assert.equal(await stamps(), 0, 'nothing until it is paid');
  await markPaid(mine.id);
  assert.equal(await stamps(), 1);
  await markPaid(mine.id);
  assert.equal(await stamps(), 1, 'paying again never stamps twice');
  await markPaid((await order(false)).id);
  assert.equal(await stamps(), 1, 'an order without the card earns nothing');
});

test('no stamp when the venue switches paid-order stamps off; erasing the member unlinks old orders', async () => {
  const { db, call, mamas, order, stamps, markPaid } = await setup();
  const programme = (await call('GET', `/owner/venues/${mamas}/loyalty`, undefined, as('user_owner', OWNER))).json;
  await call('PUT', `/owner/venues/${mamas}/loyalty`, { ...programme, stampOnPaidOrder: false }, as('user_owner', OWNER));
  const mine = await order(true);
  await markPaid(mine.id);
  assert.equal(await stamps(), 0);

  const memberId = (await db.select().from(orders).where(eq(orders.id, mine.id)))[0]!.loyaltyMemberId!;
  await call('DELETE', `/owner/venues/${mamas}/loyalty/customers/${memberId}`, undefined, as('user_owner', OWNER));
  const [after] = await db.select().from(orders).where(eq(orders.id, mine.id));
  assert.equal(after!.loyaltyMemberId, null);
  assert.equal(after!.paidPesewas, after!.totalPesewas, 'the paid order itself stays, for tax');
});
