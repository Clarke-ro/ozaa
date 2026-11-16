import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectContract } from '../contract/contract.ts';
import { as, KITCHEN, OWNER, ownerSetup, WAITER } from './ownerTestSetup.ts';

async function setup() {
  const app = await ownerSetup();
  const guestAt = async (venueSlug: string, tableCode?: string) => {
    const res = await app.call('POST', '/guest-sessions', { venueSlug, ...(tableCode ? { tableCode } : {}) });
    return { Authorization: `Bearer ${res.json.guestToken as string}` };
  };
  return { ...app, guestAt };
}

test('a table calls the waiter; calling again changes the reason instead of adding a second call', async () => {
  const { call, guestAt, mamas } = await setup();
  const table = await guestAt('mamas-kitchen', '7');
  const first = await call('POST', '/waiter-calls', { reason: 'water' }, { ...table, 'Idempotency-Key': 'k1' });
  expectContract('callWaiter', 201, first.json);
  assert.equal(first.json.status, 'open');
  assert.equal(first.json.tableCode, '7');
  // The same tap retried returns the same call.
  assert.equal((await call('POST', '/waiter-calls', { reason: 'water' }, { ...table, 'Idempotency-Key': 'k1' })).json.id, first.json.id);
  const again = await call('POST', '/waiter-calls', { reason: 'bill', note: 'Card please' }, { ...table, 'Idempotency-Key': 'k2' });
  assert.equal(again.json.id, first.json.id);
  assert.equal(again.json.reason, 'bill');

  const queue = await call('GET', `/owner/venues/${mamas}/waiter-calls`, undefined, as('user_waiter', WAITER));
  expectContract('ownerListWaiterCalls', 200, queue.json);
  assert.equal(queue.json.items.length, 1);
  assert.equal(queue.json.items[0].note, 'Card please');
});

test('only table guests can call, and only that table sees its call', async () => {
  const { call, guestAt } = await setup();
  const online = await guestAt('mamas-kitchen');
  assert.equal((await call('POST', '/waiter-calls', { reason: 'water' }, online)).status, 400);
  assert.equal((await call('POST', '/waiter-calls', { reason: 'water' })).status, 401);
  const mine = (await call('POST', '/waiter-calls', { reason: 'cutlery' }, await guestAt('mamas-kitchen', '7'))).json;
  const read = await call('GET', `/waiter-calls/${mine.id}`, undefined, await guestAt('mamas-kitchen', '7'));
  expectContract('getWaiterCall', 200, read.json);
  const other = await call('GET', `/waiter-calls/${mine.id}`, undefined, await guestAt('mamas-kitchen', '8'));
  expectContract('getWaiterCall', 404, other.json);
});

test('"On my way" shows the staff name to the guest; a reply resolves the call', async () => {
  const { call, guestAt } = await setup();
  const table = await guestAt('mamas-kitchen', '7');
  const made = (await call('POST', '/waiter-calls', { reason: 'water' }, table)).json;
  const path = `/owner/waiter-calls/${made.id}`;

  // The cook can't answer calls.
  assert.equal((await call('PATCH', path, { status: 'acknowledged' }, as('user_kitchen', KITCHEN))).status, 403);
  const onMyWay = await call('PATCH', path, { status: 'acknowledged' }, as('user_waiter', WAITER));
  expectContract('ownerUpdateWaiterCall', 200, onMyWay.json);
  assert.equal(onMyWay.json.staffFirstName, 'waiter');
  assert.equal((await call('GET', `/waiter-calls/${made.id}`, undefined, table)).json.status, 'acknowledged');

  const replied = await call('PATCH', path, { reply: 'Coming in 2 min' }, as('user_owner', OWNER));
  assert.equal(replied.json.status, 'resolved');
  assert.equal(replied.json.reply, 'Coming in 2 min');
  // A finished call can't move again, and it leaves the queue.
  assert.equal((await call('PATCH', path, { status: 'acknowledged' }, as('user_waiter', WAITER))).status, 409);
  assert.equal((await call('PATCH', path, {}, as('user_waiter', WAITER))).status, 400);
});

test('a snooze hides the call from the queue for a few minutes, then it comes back', async () => {
  const { call, guestAt, mamas, tick } = await setup();
  const made = (await call('POST', '/waiter-calls', { reason: 'water' }, await guestAt('mamas-kitchen', '7'))).json;
  const queue = () => call('GET', `/owner/venues/${mamas}/waiter-calls`, undefined, as('user_waiter', WAITER));
  await call('PATCH', `/owner/waiter-calls/${made.id}`, { snoozeMinutes: 2 }, as('user_waiter', WAITER));
  assert.equal((await queue()).json.items.length, 0);
  tick(2 * 60_000);
  assert.equal((await queue()).json.items.length, 1);
  // Today's history includes finished calls.
  const history = await call('GET', `/owner/venues/${mamas}/waiter-calls?open=false&since=2026-11-16T00:00:00Z`, undefined, as('user_owner', OWNER));
  assert.equal(history.json.items.length, 1);
});
