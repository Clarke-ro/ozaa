import {
  canAwardGameStamp,
  isRewardReady,
  stampsAfterPaidOrder,
  stampsAfterRedeem,
  stampCard,
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

describe('stampCard', () => {
  test('counts toward the next reward ahead, not one already earned', () => {
    const card = stampCard(5, [4, 8]);
    expect(card.goal).toBe(8);
    expect(card.counter).toBe('5/8');
    expect(card.slots).toHaveLength(8);
    expect(card.slots.filter((s) => s.stamped)).toHaveLength(5);
    // A gift marks each reward's slot (4th and 8th).
    expect(card.slots.map((s) => s.reward)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
    ]);
  });

  test('before the first reward it counts toward that one, on the same size of card', () => {
    const card = stampCard(2, [4, 8]);
    expect(card.counter).toBe('2/4');
    expect(card.slots).toHaveLength(8);
  });

  test('with every reward earned the card reads full, never past it', () => {
    expect(stampCard(9, [4, 8]).counter).toBe('8/8');
    expect(stampCard(8, [4, 8]).slots.every((s) => s.stamped)).toBe(true);
  });

  test('a long card is capped at 12 circles and a venue with no rewards gets 8', () => {
    expect(stampCard(3, [20]).slots).toHaveLength(12);
    expect(stampCard(3, [20]).counter).toBe('3/20');
    expect(stampCard(0, []).slots).toHaveLength(8);
    expect(stampCard(0, []).counter).toBe('0/8');
  });
});
