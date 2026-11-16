import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectContract } from '../contract/contract.ts';
import { as, KITCHEN, OWNER, ownerSetup } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);

test('tables: listed in number order with their QR address; adding is safe to repeat', async () => {
  const { call, mamas } = await ownerSetup();
  const base = `/owner/venues/${mamas}/tables`;
  const list = await call('GET', base, undefined, as('user_kitchen', KITCHEN));
  expectContract('ownerListTables', 200, list.json);
  assert.deepEqual(list.json.items.slice(0, 3).map((t: { code: string }) => t.code), ['1', '2', '3']);
  assert.equal(list.json.items[11].qrUrl, 'https://cravins-app.vercel.app/mamas-kitchen/t/12');

  assert.equal((await call('POST', base, { codes: ['13'] }, as('user_kitchen', KITCHEN))).status, 403);
  assert.equal((await call('POST', base, { codes: ['a b'] }, owner)).status, 400);
  const added = await call('POST', base, { codes: ['12', '13', 'Patio-1', '13'] }, owner);
  expectContract('ownerCreateTables', 201, added.json);
  assert.deepEqual(added.json.items.map((t: { code: string }) => t.code), ['12', '13', 'Patio-1']);
  // Table 12 kept its id; the new ones work for guests straight away.
  assert.equal(added.json.items[0].id, list.json.items[11].id);
  const scan = await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: 'Patio-1' });
  assert.equal(scan.status, 201);
  assert.equal((await call('GET', base, undefined, owner)).json.items.length, 14);
});

test('a table QR is an SVG of its table page; other formats and other venues are refused', async () => {
  const { mamas, call } = await ownerSetup();
  const table = (await call('GET', `/owner/venues/${mamas}/tables`, undefined, owner)).json.items[0];
  const qr = await call('GET', `/owner/venues/${mamas}/tables/${table.id}/qr`, undefined, owner);
  assert.equal(qr.status, 200);
  assert.equal(qr.type, 'image/svg+xml');
  assert.match(qr.text, /^<svg /);
  assert.equal((await call('GET', `/owner/venues/${mamas}/tables/${table.id}/qr?format=pdf`, undefined, owner)).json.code, 'format_not_ready');
  const bean = (await call('GET', '/venues/bean-there')).json.id;
  assert.equal((await call('GET', `/owner/venues/${bean}/tables/${table.id}/qr`, undefined, owner)).status, 404);
});
