import type { LoyaltyProgram } from '@/lib/api/types';

export type Cooldown = 'none' | '1h' | '4h' | '1d';

export type ProgramForm = {
  enabled: boolean;
  reward: string;
  stamps: number;
  halfway: string;
  cooldown: Cooldown;
  welcome: string;
  birthday: string;
  winbackDays: number;
  winback: string;
};

export const STAMPS = { min: 2, max: 50 } as const;
export const WINBACK_DAYS = { min: 7, max: 180 } as const;

/** What the form shows for a saved program. Empty fields stay empty: no sample rewards. */
export function formFrom(p: LoyaltyProgram | undefined): ProgramForm {
  return {
    enabled: p?.enabled ?? false,
    reward: p?.rewards[0]?.title ?? '',
    stamps: p?.stampsRequired ?? 10,
    halfway: p?.secondTierReward ?? '',
    cooldown: p?.cooldown ?? '1h',
    welcome: p?.automations?.welcomeReward ?? '',
    birthday: p?.automations?.birthdayReward ?? '',
    winbackDays: p?.automations?.winbackDays ?? 30,
    winback: p?.automations?.winbackReward ?? '',
  };
}

/** The program to save, or the field that needs fixing first. Fields the form does not show are kept. */
export function programFrom(
  p: LoyaltyProgram,
  f: ProgramForm,
): { ok: true; program: LoyaltyProgram } | { ok: false; field: 'reward' } {
  const reward = f.reward.trim();
  if (f.enabled && !reward) return { ok: false, field: 'reward' };
  const text = (s: string) => s.trim() || undefined;
  const stamps = Math.min(STAMPS.max, Math.max(STAMPS.min, Math.round(f.stamps)));
  return {
    ok: true,
    program: {
      ...p,
      enabled: f.enabled,
      stampsRequired: stamps,
      secondTierReward: text(f.halfway),
      cooldown: f.cooldown,
      rewards: reward
        ? [{ id: p.rewards[0]?.id ?? 'rew_1', title: reward, cost: stamps }, ...p.rewards.slice(1)]
        : p.rewards,
      automations: {
        ...p.automations,
        welcomeReward: text(f.welcome),
        birthdayReward: text(f.birthday),
        winbackDays: Math.min(
          WINBACK_DAYS.max,
          Math.max(WINBACK_DAYS.min, Math.round(f.winbackDays)),
        ),
        winbackReward: text(f.winback),
      },
    },
  };
}
