import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { expectContract } from '../contract/contract.ts';
import { as, KITCHEN, OWNER, ownerSetup } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);

async function setup() {
  const app = await ownerSetup();
  const token = (await app.call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '4' })).json.guestToken;
  return { ...app, guest: { Authorization: `Bearer ${token}` } };
}

async function placeOrder(call: Awaited<ReturnType<typeof setup>>['call'], guest: { Authorization: string }) {
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const made = await call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] }, guest);
  assert.equal(made.status, 201);
  return made.json.id as string;
}

test('a review reaches the owner with the same thank-you for any stars; the owner can reply', async () => {
  const { call, mamas, guest } = await setup();
  const firstOrder = await placeOrder(call, guest);
  const secondOrder = await placeOrder(call, guest);
  const made = [];
  for (const [stars, orderId] of [[1, firstOrder], [5, secondOrder]] as const) {
    const review = await call('POST', '/reviews', { stars, highlights: ['food'], text: 'Jollof!', orderId }, guest);
    expectContract('createReview', 201, review.json);
    assert.equal(review.json.googleReviewUrl, null);
    made.push(review.json.id);
  }
  // One review per order. A retry returns the first one and does not add another.
  const again = await call('POST', '/reviews', { stars: 1, orderId: firstOrder }, guest);
  assert.equal(again.status, 201);
  assert.equal(again.json.id, made[0]);
  // No order yet: nothing to review. An order id from somewhere else is the same answer.
  const fresh = (await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '5' })).json.guestToken;
  const none = await call('POST', '/reviews', { stars: 4 }, { Authorization: `Bearer ${fresh}` });
  assert.equal(none.status, 422);
  assert.equal(none.json.code, 'review_needs_order');
  assert.equal((await call('POST', '/reviews', { stars: 4, orderId: firstOrder }, { Authorization: `Bearer ${fresh}` })).json.code, 'review_needs_order');
  // An older app sends no order id. The visit's latest order is used.
  await placeOrder(call, guest);
  const inferred = await call('POST', '/reviews', { stars: 4, text: 'No id sent' }, guest);
  assert.equal(inferred.status, 201);
  assert.equal((await call('POST', '/reviews', { stars: 6 }, guest)).status, 400);
  const list = await call('GET', `/owner/venues/${mamas}/written-reviews`, undefined, owner);
  expectContract('ownerListWrittenReviews', 200, list.json);
  assert.equal(list.json.items.length, 3);
  assert.equal((await call('GET', `/owner/venues/${mamas}/written-reviews`, undefined, as('user_kitchen', KITCHEN))).status, 403);
  const replied = await call('POST', `/owner/written-reviews/${list.json.items[0].id}/reply`, { text: 'Thank you, come again!' }, owner);
  expectContract('ownerReplyToReview', 200, replied.json);
  assert.equal(replied.json.reply, 'Thank you, come again!');
});

test('a private note is scored for mood, hidden for two hours, then listed, searched, archived and summed up', async () => {
  const { call, mamas, guest, tick } = await setup();
  assert.equal((await call('POST', '/feedback', { message: 'Food was cold and the waiter was rude', contactPhone: '+233241112222' }, guest)).status, 201);
  await call('POST', '/feedback', { message: 'Loved the jollof, great service!' }, guest);
  const list = () => call('GET', `/owner/venues/${mamas}/feedback`, undefined, owner);
  assert.equal((await list()).json.items.length, 0);
  tick(2 * 60 * 60 * 1000);
  const notes = await list();
  expectContract('ownerListFeedback', 200, notes.json);
  assert.deepEqual(notes.json.items.map((n: { sentiment: string }) => n.sentiment).sort(), ['negative', 'positive']);
  const cold = notes.json.items.find((n: { sentiment: string }) => n.sentiment === 'negative');
  assert.equal((await call('GET', `/owner/venues/${mamas}/feedback?search=cold`, undefined, owner)).json.items.length, 1);

  const archived = await call('PATCH', `/owner/venues/${mamas}/feedback/${cold.id}/archive`, { archived: true }, owner);
  expectContract('ownerArchiveFeedback', 200, archived.json);
  assert.equal((await list()).json.items.length, 1);
  assert.equal((await call('GET', `/owner/venues/${mamas}/feedback?state=archived`, undefined, owner)).json.items.length, 1);

  const answer = await call('POST', `/owner/venues/${mamas}/feedback/ask`, { question: 'What are my biggest complaints?' }, owner);
  expectContract('ownerAskFeedbackAi', 200, answer.json);
  assert.match(answer.json.reply, /2 notes/);
  assert.match(answer.json.reply, /cold/);
});

test('a visit can leave a few notes, and then no more', async () => {
  const { call, guest } = await setup();
  for (let i = 0; i < 3; i += 1) {
    assert.equal((await call('POST', '/feedback', { message: `Note number ${i} from the table` }, guest)).status, 201);
  }
  const extra = await call('POST', '/feedback', { message: 'And another note on top of those' }, guest);
  assert.equal(extra.status, 429);
  assert.equal(extra.json.code, 'feedback_limit');
});

test('the game: scores rank this week, impossible ones are refused, the board shows the best per nickname', async () => {
  const { call, guest } = await setup();
  const play = (score: number, nickname?: string, durationMs = 60_000) =>
    call('POST', '/venues/mamas-kitchen/game/scores', { score, runId: randomUUID(), durationMs, ...(nickname ? { nickname } : {}) }, guest);
  const first = await play(12, 'Kwame');
  expectContract('submitScore', 201, first.json);
  assert.equal(first.json.rank, 1);
  assert.equal(first.json.stampEarned, false);
  await play(20, 'Esi');
  await play(15, 'Kwame');
  await play(30);
  const fast = await play(40, 'Cheat', 1000);
  expectContract('submitScore', 422, fast.json);
  const slow = await play(1, 'Cheat', 13 * 60 * 60 * 1000);
  assert.equal(slow.status, 422);
  assert.equal(slow.json.code, 'score_not_possible');

  const board = await call('GET', '/venues/mamas-kitchen/game/leaderboard');
  expectContract('getLeaderboard', 200, board.json);
  assert.deepEqual(board.json.entries.map((e: { nickname: string; score: number }) => `${e.nickname} ${e.score}`), ['Esi 20', 'Kwame 15']);
  assert.equal((await play(1)).json.rank, 5);
});
