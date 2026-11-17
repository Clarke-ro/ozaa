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

test('a review reaches the owner with the same thank-you for any stars; the owner can reply', async () => {
  const { call, mamas, guest } = await setup();
  for (const stars of [1, 5]) {
    const made = await call('POST', '/reviews', { stars, highlights: ['food'], text: 'Jollof!' }, guest);
    expectContract('createReview', 201, made.json);
    assert.equal(made.json.googleReviewUrl, null);
  }
  assert.equal((await call('POST', '/reviews', { stars: 6 }, guest)).status, 400);
  const list = await call('GET', `/owner/venues/${mamas}/written-reviews`, undefined, owner);
  expectContract('ownerListWrittenReviews', 200, list.json);
  assert.equal(list.json.items.length, 2);
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

  const archived = await call('POST', `/owner/venues/${mamas}/feedback/${cold.id}/archive`, { archived: true }, owner);
  expectContract('ownerArchiveFeedback', 200, archived.json);
  assert.equal((await list()).json.items.length, 1);
  assert.equal((await call('GET', `/owner/venues/${mamas}/feedback?state=archived`, undefined, owner)).json.items.length, 1);

  const answer = await call('POST', `/owner/venues/${mamas}/feedback/ask`, { question: 'What are my biggest complaints?' }, owner);
  expectContract('ownerAskFeedbackAi', 200, answer.json);
  assert.match(answer.json.reply, /2 notes/);
  assert.match(answer.json.reply, /cold/);
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

  const board = await call('GET', '/venues/mamas-kitchen/game/leaderboard');
  expectContract('getLeaderboard', 200, board.json);
  assert.deepEqual(board.json.entries.map((e: { nickname: string; score: number }) => `${e.nickname} ${e.score}`), ['Esi 20', 'Kwame 15']);
  assert.equal((await play(1)).json.rank, 5);
});
