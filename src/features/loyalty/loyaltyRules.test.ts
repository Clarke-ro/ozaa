import {
  canAwardGameStamp,
  isRewardReady,
  stampsAfterPaidOrder,
  stampsAfterRedeem,
  stampsLeftPhrase,
} from './loyaltyRules';

test('a paid order adds one stamp and a reward unlocks at the venue target', () => {
  expect(stampsAfterPaidOrder(5)).toBe(6);
  expect(isRewardReady(7, 8)).toBe(false);
  expect(isRewardReady(8, 8)).toBe(true);
  expect(stampsAfterRedeem(8, 8)).toBe(0);
});

test('the game stamp is once per day on this phone', () => {
  expect(canAwardGameStamp(null, '2026-10-31')).toBe(true);
  expect(canAwardGameStamp('2026-10-31', '2026-10-31')).toBe(false);
  expect(canAwardGameStamp('2026-10-30', '2026-10-31')).toBe(true);
});

test('the stamp sentence matches the card copy', () => {
  expect(stampsLeftPhrase(6, 10)).toBe('6 of 10. Four more and the next one is on us.');
  expect(stampsLeftPhrase(10, 10)).toBe('Your reward is ready.');
});
