import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectContract } from '../contract/contract.ts';
import { signLoyaltyToken } from '../guest/loyaltyToken.ts';
import { as, KITCHEN, OWNER, ownerSetup, WAITER } from './ownerTestSetup.ts';
import { TEST_KEY } from './testHelpers.ts';

const owner = as('user_owner', OWNER);
const waiter = as('user_waiter', WAITER);
const guestCard = (phone: string) => ({ Authorization: `Bearer ${signLoyaltyToken(TEST_KEY, phone, Date.parse('2027-01-01'))}` });
const consent = { loyalty: true, marketing: true, textVersion: 'consent-2026-10-v1' };

async function withMember() {
  const app = await ownerSetup();
  const joined = (await app.call('PUT', '/venues/mamas-kitchen/loyalty/me', { firstName: 'Esi', consent }, guestCard('+233241234567'))).json;
  return { ...app, memberId: joined.member.id as string };
}

test('the programme: staff read it; owners save it and their extra settings stick', async () => {
  const { call, mamas } = await ownerSetup();
  const read = await call('GET', `/owner/venues/${mamas}/loyalty`, undefined, as('user_kitchen', KITCHEN));
  expectContract('ownerGetLoyalty', 200, read.json);
  const next = { ...read.json, rewards: [...read.json.rewards, { id: 'rwd_new', title: 'Free kelewele', cost: 6 }], lockscreenMessage: 'See you soon', stampOnPaidOrder: false };
  assert.equal((await call('PUT', `/owner/venues/${mamas}/loyalty`, next, waiter)).status, 403);
  const saved = await call('PUT', `/owner/venues/${mamas}/loyalty`, next, owner);
  expectContract('ownerSetLoyalty', 200, saved.json);
  assert.equal(saved.json.rewards.length, 3);
  const again = (await call('GET', `/owner/venues/${mamas}/loyalty`, undefined, owner)).json;
  assert.equal(again.lockscreenMessage, 'See you soon');
  assert.equal(again.stampOnPaidOrder, false);
  assert.equal((await call('GET', '/venues/mamas-kitchen/loyalty')).json.rewards.length, 3);
});

test('at the counter: a scan stamps once an hour, a reward comes off, and the scan log shows who did it', async () => {
  const { call, mamas, memberId, tick } = await withMember();
  const scan = (action: 'stamp' | 'redeem') => call('POST', `/owner/venues/${mamas}/loyalty/scan`, { qrPayload: `cravins://loyalty/mamas-kitchen/${memberId}`, action }, waiter);
  const first = await scan('stamp');
  expectContract('ownerScanLoyaltyCard', 200, first.json);
  assert.equal(first.json.stamps, 1);
  const soon = await scan('stamp');
  assert.equal(soon.json.cooldownViolated, true);
  assert.equal(soon.json.stamps, 1);
  for (let i = 0; i < 3; i += 1) {
    tick(61 * 60_000);
    await call('POST', `/owner/venues/${mamas}/loyalty/customers/${memberId}/stamp`, undefined, waiter);
  }
  assert.equal((await scan('stamp')).json.cooldownViolated, true);
  const gift = await scan('redeem');
  assert.equal(gift.json.message, 'Free chilled sobolo');
  assert.equal(gift.json.stamps, 0);
  assert.equal((await scan('redeem')).json.code, 'cannot_afford');
  assert.equal((await call('POST', `/owner/venues/${mamas}/loyalty/scan`, { qrPayload: 'nope', action: 'stamp' }, waiter)).json.code, 'card_not_found');
  assert.equal((await call('POST', `/owner/venues/${mamas}/loyalty/scan`, { qrPayload: memberId, action: 'stamp' }, as('user_kitchen', KITCHEN))).status, 403);

  const log = await call('GET', `/owner/venues/${mamas}/loyalty/scans?since=2026-11-16T00:00:00Z`, undefined, owner);
  expectContract('ownerListLoyaltyScans', 200, log.json);
  assert.deepEqual(log.json.items.map((r: { action: string }) => r.action), ['reward', 'stamp', 'stamp', 'stamp', 'stamp']);
  assert.equal(log.json.items[0].by, 'waiter');
  assert.equal(log.json.items[1].stampsAfter, 4);
});

test('a guest code is confirmed by staff once; customers, detail, analytics and erasure', async () => {
  const { call, mamas, memberId, tick } = await withMember();
  for (let i = 0; i < 4; i += 1) {
    const stamped = await call('POST', `/owner/venues/${mamas}/loyalty/customers/${memberId}/stamp`, undefined, owner);
    assert.equal(stamped.status, 200);
    expectContract('ownerStampLoyaltyCustomer', 200, stamped.json);
    tick(61 * 60_000);
  }
  const claimed = (await call('POST', '/venues/mamas-kitchen/loyalty/me/redeem', { rewardId: 'rwd_sobolo' }, { ...guestCard('+233241234567'), 'Idempotency-Key': 'g1' })).json;
  const code = claimed.member.facts.find((f: { kind: string }) => f.kind === 'claim').code;
  const confirmed = await call('POST', `/owner/venues/${mamas}/loyalty/confirm`, { code }, { ...waiter, 'Idempotency-Key': 'c1' });
  expectContract('ownerConfirmRedemption', 200, confirmed.json);
  assert.equal((await call('POST', `/owner/venues/${mamas}/loyalty/confirm`, { code }, { ...waiter, 'Idempotency-Key': 'c1' })).status, 200, 'a retried tap is fine');
  // Confirming the same code again is harmless: the shared rules never take the stamps off twice.
  const twice = await call('POST', `/owner/venues/${mamas}/loyalty/confirm`, { code }, { ...waiter, 'Idempotency-Key': 'c2' });
  assert.equal(twice.json.member.facts.filter((f: { kind: string }) => f.kind === 'confirm').length, 1);
  assert.equal((await call('POST', `/owner/venues/${mamas}/loyalty/confirm`, { code: 'ZZZZZZ' }, waiter)).json.code, 'claim_unknown');

  const members = await call('GET', `/owner/venues/${mamas}/loyalty/members`, undefined, owner);
  expectContract('ownerListLoyaltyMembers', 200, members.json);
  const customers = await call('GET', `/owner/venues/${mamas}/loyalty/customers?search=4567`, undefined, owner);
  expectContract('ownerListLoyaltyCustomers', 200, customers.json);
  assert.equal(customers.json.items.length, 1);
  assert.equal((await call('GET', `/owner/venues/${mamas}/loyalty/customers?search=9999`, undefined, owner)).json.items.length, 0);
  const detail = await call('GET', `/owner/venues/${mamas}/loyalty/customers/${memberId}`, undefined, owner);
  expectContract('ownerGetLoyaltyCustomer', 200, detail.json);
  assert.equal(detail.json.consent.textVersion, 'consent-2026-10-v1');
  const stats = await call('GET', `/owner/venues/${mamas}/loyalty/analytics?range=7d`, undefined, owner);
  expectContract('ownerGetLoyaltyAnalytics', 200, stats.json);
  assert.equal(stats.json.stampsIssued, 4);
  assert.equal(stats.json.rewardsRedeemed, 1);

  assert.equal((await call('DELETE', `/owner/venues/${mamas}/loyalty/customers/${memberId}`, undefined, waiter)).status, 403);
  const erased = await call('DELETE', `/owner/venues/${mamas}/loyalty/customers/${memberId}`, undefined, owner);
  assert.equal(erased.status, 204);
  expectContract('ownerRemoveLoyaltyCustomer', 204, erased.json);
  assert.equal((await call('GET', `/owner/venues/${mamas}/loyalty/customers`, undefined, owner)).json.totalCount, 0);
});
