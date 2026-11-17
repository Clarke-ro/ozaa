import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { expectContract } from '../contract/contract.ts';
import { loyaltyFacts, loyaltyMembers } from '../db/schema.ts';
import { signLoyaltyToken } from '../guest/loyaltyToken.ts';
import { as, OWNER, ownerSetup } from './ownerTestSetup.ts';
import { TEST_KEY } from './testHelpers.ts';

const PHONE = '+233241234567';
const card = (phone = PHONE) => ({ Authorization: `Bearer ${signLoyaltyToken(TEST_KEY, phone, Date.parse('2027-01-01'))}` });
const consent = { loyalty: true, marketing: false, textVersion: 'consent-2026-10-v1' };

test('join with recorded consent, see the card, and the programme counts real members', async () => {
  const { call, db } = await ownerSetup();
  const programme = await call('GET', '/venues/mamas-kitchen/loyalty');
  expectContract('getVenueLoyaltyProgram', 200, programme.json);
  assert.equal(programme.json.memberCount, 0);

  assert.equal((await call('GET', '/venues/mamas-kitchen/loyalty/me')).status, 401);
  assert.equal((await call('GET', '/venues/mamas-kitchen/loyalty/me', undefined, card())).json.code, 'not_a_member');
  const refused = await call('PUT', '/venues/mamas-kitchen/loyalty/me', { consent: { ...consent, loyalty: false } }, card());
  assert.equal(refused.json.code, 'consent_required');

  const joined = await call('PUT', '/venues/mamas-kitchen/loyalty/me', { firstName: 'Ama', birthdayMonthDay: '03-14', consent }, card());
  expectContract('joinLoyalty', 200, joined.json);
  assert.equal(joined.json.member.phoneMasked, '024 *** 4567');
  assert.equal(joined.json.programme.memberCount, 1);
  const [row] = await db.select().from(loyaltyMembers);
  assert.equal(row!.consentTextVersion, 'consent-2026-10-v1');
  assert.equal(row!.marketingConsent, false);
  expectContract('getMyLoyaltyCard', 200, (await call('GET', '/venues/mamas-kitchen/loyalty/me', undefined, card())).json);
  // A forged token gets nothing.
  assert.equal((await call('GET', '/venues/mamas-kitchen/loyalty/me', undefined, { Authorization: 'Bearer lty.v1.a.b.c' })).status, 401);
});

test('game wins earn one stamp a day when the venue switches it on; a reward needs enough stamps', async () => {
  const { call, mamas } = await ownerSetup();
  await call('PUT', '/venues/mamas-kitchen/loyalty/me', { consent }, card());
  const token = (await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '2' })).json.guestToken;
  const play = () =>
    call('POST', '/venues/mamas-kitchen/game/scores', { score: 20, runId: randomUUID(), durationMs: 60_000 }, { Authorization: `Bearer ${token}`, 'X-Loyalty-Token': card().Authorization.slice(7) });

  const services = (await call('GET', `/owner/venues/${mamas}/services`, undefined, as('user_owner', OWNER))).json;
  const setGame = (enabled: boolean) => call('PUT', `/owner/venues/${mamas}/services`, { ...services, game: { enabled, minScore: 15 } }, as('user_owner', OWNER));
  await setGame(false);
  assert.equal((await play()).json.stampEarned, false, 'no stamp while the venue has the rule off');
  await setGame(true);
  assert.equal((await play()).json.stampEarned, true);
  assert.equal((await play()).json.stampEarned, false, 'one game stamp a day');

  const tooDear = await call('POST', '/venues/mamas-kitchen/loyalty/me/redeem', { rewardId: 'rwd_sobolo' }, { ...card(), 'Idempotency-Key': 'k1' });
  expectContract('redeemReward', 409, tooDear.json);
  assert.equal(tooDear.json.code, 'cannot_afford');
});

test('a claim opens once and waits for staff; leaving deletes the card and its ledger', async () => {
  const { call, db } = await ownerSetup();
  await call('PUT', '/venues/mamas-kitchen/loyalty/me', { consent }, card());
  // Four stamps, as staff will add them in the owner app.
  const [m] = await db.select().from(loyaltyMembers);
  await db.insert(loyaltyFacts).values(
    [1, 2, 3, 4].map((i) => ({ id: `fct_t${i}`, memberId: m!.id, venueId: m!.venueId, kind: 'earn' as const, units: 1, at: new Date('2026-11-16T10:00:00Z'), details: { source: { type: 'game', runId: `r${i}`, day: `2026-11-1${i}` } } })),
  );
  const claimed = await call('POST', '/venues/mamas-kitchen/loyalty/me/redeem', { rewardId: 'rwd_sobolo' }, { ...card(), 'Idempotency-Key': 'k1' });
  expectContract('redeemReward', 200, claimed.json);
  const claim = claimed.json.member.facts.find((f: { kind: string }) => f.kind === 'claim');
  assert.match(claim.code, /^[A-Z0-9]{6}$/);
  // The same tap again returns the same claim.
  const again = await call('POST', '/venues/mamas-kitchen/loyalty/me/redeem', { rewardId: 'rwd_sobolo' }, { ...card(), 'Idempotency-Key': 'k1' });
  assert.equal(again.json.member.facts.filter((f: { kind: string }) => f.kind === 'claim').length, 1);
  // Asking for another reward while a code waits is refused (the shared rules: one claim at a time).
  assert.equal((await call('POST', '/venues/mamas-kitchen/loyalty/me/redeem', { rewardId: 'rwd_mamas' }, { ...card(), 'Idempotency-Key': 'k2' })).json.code, 'claim_open');

  assert.equal((await call('DELETE', '/venues/mamas-kitchen/loyalty/me', undefined, card())).status, 204);
  assert.equal((await db.select().from(loyaltyMembers)).length, 0);
  assert.equal((await db.select().from(loyaltyFacts).where(eq(loyaltyFacts.kind, 'claim'))).length, 0);
});
