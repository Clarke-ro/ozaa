import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectContract } from '../contract/contract.ts';
import { as, OWNER, ownerSetup, WAITER } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);

test('custom links: owners add, reorder, edit and delete; only web, email and phone links', async () => {
  const { call, mamas } = await ownerSetup();
  const base = `/owner/venues/${mamas}/links`;
  assert.equal((await call('POST', base, { title: 'Menu PDF', url: 'https://example.com/menu.pdf' }, as('user_waiter', WAITER))).status, 403);
  const first = await call('POST', base, { title: 'Menu PDF', url: 'https://example.com/menu.pdf' }, owner);
  expectContract('ownerCreateCustomLink', 201, first.json);
  assert.equal(first.json.placement, 'button');
  const second = (await call('POST', base, { title: 'Call us', url: 'tel:+233241234567', placement: 'banner' }, owner)).json;
  assert.equal(second.sortOrder, 2);
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://x.com']) {
    assert.equal((await call('POST', base, { title: 'Bad', url }, owner)).status, 400, url);
  }
  const dates = { startDate: '2026-12-02T00:00:00Z', endDate: '2026-12-01T00:00:00Z' };
  assert.equal((await call('POST', base, { title: 'Late', url: 'https://example.com', ...dates }, owner)).json.code, 'link_dates');

  const moved = await call('PATCH', `${base}/${second.id}`, { sortOrder: 0, enabled: false }, owner);
  expectContract('ownerUpdateCustomLink', 200, moved.json);
  const list = await call('GET', base, undefined, owner);
  expectContract('ownerListCustomLinks', 200, list.json);
  assert.deepEqual(list.json.items.map((l: { title: string }) => l.title), ['Call us', 'Menu PDF']);
  const removed = await call('DELETE', `${base}/${first.json.id}`, undefined, owner);
  assert.equal(removed.status, 204);
  expectContract('ownerDeleteCustomLink', 204, removed.json);
  assert.equal((await call('GET', base, undefined, owner)).json.items.length, 1);
  assert.equal((await call('PATCH', `${base}/${first.json.id}`, { title: 'x' }, owner)).status, 404);
});

test('an edit that changes nothing gives the link back as it was, not a server error', async () => {
  const { call, mamas } = await ownerSetup();
  const base = `/owner/venues/${mamas}/links`;
  const link = (await call('POST', base, { title: 'Menu PDF', url: 'https://example.com/menu.pdf' }, owner)).json;
  const same = await call('PATCH', `${base}/${link.id}`, {}, owner);
  assert.equal(same.status, 200);
  expectContract('ownerUpdateCustomLink', 200, same.json);
  assert.equal(same.json.title, 'Menu PDF');
});
