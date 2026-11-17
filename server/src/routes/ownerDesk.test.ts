import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { expectContract } from '../contract/contract.ts';
import { as, KITCHEN, OWNER, ownerSetup } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);

async function withOrder() {
  const app = await ownerSetup();
  const token = (await app.call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '4' })).json.guestToken;
  await app.call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen' });
  const guest = { Authorization: `Bearer ${token}` };
  const dish = (await app.call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const order = (await app.call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 2 }] }, guest)).json;
  return { ...app, guest, order, dish };
}

test('the floor shows a table with an order as busy, and one calling a waiter first', async () => {
  const { call, mamas, guest } = await withOrder();
  const floor = await call('GET', `/owner/venues/${mamas}/floor`, undefined, as('user_kitchen', KITCHEN));
  expectContract('ownerGetFloor', 200, floor.json);
  const four = () => call('GET', `/owner/venues/${mamas}/floor`, undefined, owner).then((r) => r.json.items.find((t: { code: string }) => t.code === '4'));
  assert.equal((await four()).status, 'ordered');
  assert.equal(floor.json.items.find((t: { code: string }) => t.code === '5').status, 'free');
  await call('POST', '/waiter-calls', { reason: 'bill' }, guest);
  assert.equal((await four()).status, 'needs_waiter');
});

test('the dashboard: live orders, visits, open calls, sold-out alerts; sales count money taken', async () => {
  const { call, mamas, order, dish } = await withOrder();
  const board = await call('GET', `/owner/venues/${mamas}/dashboard`, undefined, owner);
  expectContract('ownerGetDashboard', 200, board.json);
  assert.equal(board.json.liveOrders, 1);
  assert.equal(board.json.visitorsToday, 2);
  assert.equal(board.json.openTables, 1);
  assert.equal(board.json.salesTodayPesewas, 0);

  await call('POST', `/owner/orders/${order.id}/manual-payment`, { method: 'cash' }, owner);
  await call('PATCH', `/owner/venues/${mamas}/menu/items/${dish.id}`, { stockCount: 0 }, owner);
  const after = (await call('GET', `/owner/venues/${mamas}/dashboard`, undefined, owner)).json;
  assert.equal(after.salesTodayPesewas, order.totalPesewas);
  assert.ok(JSON.stringify(after.alerts).includes(dish.name.en));
});

test('sales: totals and top dishes for a range, owners and managers only', async () => {
  const { call, mamas, order, dish } = await withOrder();
  assert.equal((await call('GET', `/owner/venues/${mamas}/sales`, undefined, as('user_kitchen', KITCHEN))).status, 403);
  const sales = await call('GET', `/owner/venues/${mamas}/sales?since=2026-11-16T00:00:00Z`, undefined, owner);
  expectContract('ownerGetSales', 200, sales.json);
  assert.equal(sales.json.orderCount, 1);
  assert.equal(sales.json.valuePesewas, order.totalPesewas);
  assert.equal(sales.json.topItems[0].name, dish.name.en);
  assert.equal(sales.json.previous, null);
  const ledger = await call('GET', `/owner/venues/${mamas}/transactions`, undefined, owner);
  expectContract('ownerListTransactions', 200, ledger.json);
});
