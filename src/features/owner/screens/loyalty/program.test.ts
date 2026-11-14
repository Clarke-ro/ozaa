import type { LoyaltyProgram } from '@/lib/api/types';
import { DEFAULT_TIERS, formFrom, programFrom } from './program';

const saved = {
  enabled: true,
  currency: 'GHS',
  earn: { kind: 'stamps' },
  tiers: [],
  rewards: [
    { id: 'rew_1', title: 'Free kelewele', cost: 5 },
    { id: 'rew_9', title: 'Free jollof', cost: 10 },
  ],
  expiryDays: null,
  claimTtlSeconds: 600,
  birthdayTreat: null,
  stampsRequired: 10,
  automations: { reviewAskReward: 'kept as is' },
  passAppearance: { bgHex: '#111111' },
} as unknown as LoyaltyProgram;

test('a new program starts empty, never with sample rewards', () => {
  expect(formFrom(undefined)).toMatchObject({
    rewards: [],
    welcome: '',
    birthday: '',
    winback: '',
  });
});

test('saving keeps every reward, their ids, and every field the form does not show', () => {
  const f = formFrom(saved);
  const result = programFrom(saved, {
    ...f,
    rewards: [...f.rewards, { id: '', title: 'Free sobolo', cost: 8 }],
  });
  expect(result.ok && result.program.rewards).toEqual([
    { id: 'rew_1', title: 'Free kelewele', cost: 5 },
    { id: 'rew_new_3', title: 'Free sobolo', cost: 8 },
    { id: 'rew_9', title: 'Free jollof', cost: 10 },
  ]);
  expect(result.ok && result.program.automations?.reviewAskReward).toBe('kept as is');
  expect(result.ok && result.program.passAppearance).toEqual({ bgHex: '#111111' });
});

test('switched on with no reward asks for one', () => {
  expect(programFrom(saved, { ...formFrom(saved), rewards: [] })).toEqual({
    ok: false,
    field: 'reward',
  });
});

test('numbers are kept inside sensible limits, and a reward never costs more than a full card', () => {
  const f = formFrom(saved);
  const result = programFrom(saved, { ...f, stamps: 500, winbackDays: 1 });
  expect(result.ok && result.program.stampsRequired).toBe(50);
  expect(result.ok && result.program.automations?.winbackDays).toBe(7);
  const short = programFrom(saved, { ...f, stamps: 6 });
  expect(short.ok && short.program.rewards.map((r) => r.cost)).toEqual([5, 6]);
});

test('tiers switch on with the canvas bands and off to none; stamps can become points', () => {
  const on = programFrom(saved, { ...formFrom(saved), tiersOn: true, earn: 'points' });
  expect(on.ok && on.program.tiers).toEqual(DEFAULT_TIERS);
  expect(on.ok && on.program.earn).toEqual({ kind: 'points', points: 1, perMinor: 100 });
  const off = programFrom(saved, { ...formFrom(saved), tiersOn: false });
  expect(off.ok && off.program.tiers).toEqual([]);
});
