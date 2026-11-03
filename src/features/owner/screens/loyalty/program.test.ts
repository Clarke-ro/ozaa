import type { LoyaltyProgram } from '@/lib/api/types';
import { formFrom, programFrom } from './program';

const saved = {
  enabled: true,
  currency: 'GHS',
  earn: { kind: 'stamps' },
  tiers: [],
  rewards: [{ id: 'rew_9', title: 'Free jollof', cost: 10 }],
  expiryDays: null,
  claimTtlSeconds: 600,
  birthdayTreat: null,
  stampsRequired: 10,
  automations: { reviewAskReward: 'kept as is' },
  passAppearance: { bgHex: '#111111' },
} as unknown as LoyaltyProgram;

test('a new program starts empty, never with sample rewards', () => {
  expect(formFrom(undefined)).toMatchObject({ reward: '', welcome: '', birthday: '', winback: '' });
});

test('saving keeps the reward id and every field the form does not show', () => {
  const result = programFrom(saved, { ...formFrom(saved), reward: 'Free waakye', stamps: 8 });
  expect(result.ok && result.program.rewards[0]).toEqual({
    id: 'rew_9',
    title: 'Free waakye',
    cost: 8,
  });
  expect(result.ok && result.program.automations?.reviewAskReward).toBe('kept as is');
  expect(result.ok && result.program.passAppearance).toEqual({ bgHex: '#111111' });
});

test('switched on with no reward name asks for one', () => {
  expect(programFrom(saved, { ...formFrom(saved), reward: '  ' })).toEqual({
    ok: false,
    field: 'reward',
  });
});

test('numbers are kept inside sensible limits', () => {
  const result = programFrom(saved, { ...formFrom(saved), stamps: 500, winbackDays: 1 });
  expect(result.ok && result.program.stampsRequired).toBe(50);
  expect(result.ok && result.program.automations?.winbackDays).toBe(7);
});
