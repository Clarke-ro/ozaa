import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moodOf } from './mood.ts';

test('a guest note reads happy, unhappy or neutral; "not good" counts as bad', () => {
  assert.deepEqual(moodOf('Loved the jollof, great service!'), { sentiment: 'positive', score: 5 });
  assert.deepEqual(moodOf('Food was cold and the waiter was rude'), { sentiment: 'negative', score: 1 });
  assert.equal(moodOf('The kelewele was not good').sentiment, 'negative');
  assert.deepEqual(moodOf('Can you add more chairs outside'), { sentiment: 'neutral', score: 3 });
  assert.equal(moodOf('Great food but slow service').sentiment, 'neutral');
});
