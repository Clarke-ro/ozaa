import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { expectContract } from '../contract/contract.ts';
import { as, KITCHEN, OWNER, ownerSetup, WAITER } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);
const waiter = as('user_waiter', WAITER);
const kitchen = as('user_kitchen', KITCHEN);

async function busyVenue() {
  const app = await ownerSetup();
  const guest = { Authorization: `Bearer ${(await app.call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '3' })).json.guestToken}` };
  const dish = (await app.call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  await app.call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] }, guest);
  await app.call('POST', '/waiter-calls', { reason: 'bill' }, guest);
  await app.call('POST', '/reviews', { stars: 5 }, guest);
  const feed = (who: Record<string, string>, query = '') => app.call('GET', `/owner/venues/${app.mamas}/notifications${query}`, undefined, who);
  return { ...app, feed };
}

test('each role sees the kinds it needs: the owner everything, waiters orders and bills, the kitchen orders', async () => {
  const { feed } = await busyVenue();
  const all = await feed(owner);
  expectContract('ownerListNotifications', 200, all.json);
  assert.deepEqual(all.json.items.map((n: { kind: string }) => n.kind).sort(), ['bill', 'order', 'review']);
  assert.equal(all.json.unreadCount, 3);
  assert.deepEqual((await feed(waiter)).json.items.map((n: { kind: string }) => n.kind).sort(), ['bill', 'order']);
  assert.deepEqual((await feed(kitchen)).json.items.map((n: { kind: string }) => n.kind), ['order']);
  assert.equal((await feed(owner, '?kind=review')).json.items.length, 1);
});

test('reading is per person: the waiter reading a call leaves it unread for the owner', async () => {
  const { call, mamas, feed } = await busyVenue();
  const bill = (await feed(waiter)).json.items.find((n: { kind: string }) => n.kind === 'bill');
  const marked = await call('POST', `/owner/venues/${mamas}/notifications/read`, { ids: [bill.id] }, waiter);
  expectContract('ownerMarkNotificationsRead', 200, marked.json);
  assert.equal(marked.json.unreadCount, 1);
  assert.ok((await feed(waiter)).json.items.find((n: { id: string }) => n.id === bill.id).readAt);
  assert.equal((await feed(owner)).json.unreadCount, 3);
  assert.equal((await feed(owner, '?unread=true')).json.items.length, 3);

  const everything = await call('POST', `/owner/venues/${mamas}/notifications/read`, {}, owner);
  assert.equal(everything.json.unreadCount, 0);
  assert.equal((await feed(owner)).json.countsByKind.order ?? 0, 0);
  // Marking again is harmless.
  assert.equal((await call('POST', `/owner/venues/${mamas}/notifications/read`, {}, owner)).json.unreadCount, 0);
});
