import { customerTags } from './customers';

const DAY = 86_400_000;
const now = Date.parse('2026-11-12T12:00:00Z');
const ago = (days: number) => new Date(now - days * DAY).toISOString();

test('new: first visit in the last 30 days', () => {
  expect(
    customerTags(
      { visitCount: 1, firstVisitAt: ago(3), lastVisitAt: ago(3), rewardReady: false },
      now,
    ),
  ).toEqual(['new']);
});

test('regular: 5 or more visits; quiet: nothing for 30 days', () => {
  expect(
    customerTags(
      { visitCount: 6, firstVisitAt: ago(120), lastVisitAt: ago(2), rewardReady: false },
      now,
    ),
  ).toEqual(['regular']);
  expect(
    customerTags(
      { visitCount: 6, firstVisitAt: ago(120), lastVisitAt: ago(45), rewardReady: true },
      now,
    ),
  ).toEqual(['regular', 'quiet', 'reward_ready']);
});

test('a member who joined but never visited has no visit tags', () => {
  expect(
    customerTags({ visitCount: 0, firstVisitAt: null, lastVisitAt: null, rewardReady: false }, now),
  ).toEqual([]);
});
