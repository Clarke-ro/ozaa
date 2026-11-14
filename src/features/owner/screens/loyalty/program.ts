import type { LoyaltyProgram } from '@/lib/api/types';

export type Cooldown = 'none' | '1h' | '4h' | '1d';
export type Reward = { id: string; title: string; cost: number };
export type Tier = LoyaltyProgram['tiers'][number];
/** "Stamps last" on the canvas: 30 days, 90 days, a year, or for ever. */
export type Expiry = 30 | 90 | 365 | null;
export const EXPIRY_CHOICES: readonly Expiry[] = [30, 90, 365, null];

export type ProgramForm = {
  enabled: boolean;
  earn: 'stamps' | 'points';
  /** Stamps on a full card. */
  stamps: number;
  rewards: Reward[];
  tiersOn: boolean;
  tiers: Tier[];
  cooldown: Cooldown;
  welcome: string;
  birthday: string;
  winbackDays: number;
  winback: string;
  /** Add a stamp on its own when a member's Cravins order is paid. */
  stampOnPaid: boolean;
  /** Stamps older than this drop off; null keeps them forever. */
  expiryDays: Expiry;
};

export const STAMPS = { min: 2, max: 50 } as const;
export const WINBACK_DAYS = { min: 7, max: 180 } as const;
/** The bands the canvas shows when tiers are first switched on; the owner can change each one. */
export const DEFAULT_TIERS: Tier[] = [
  { id: 'bronze', minLifetime: 0 },
  { id: 'silver', minLifetime: 20 },
  { id: 'gold', minLifetime: 50 },
];
// One point for every GH₵1 (100 pesewas) when switching to points with nothing saved before.
const DEFAULT_POINTS = { kind: 'points', points: 1, perMinor: 100 } as const;

const nearestExpiry = (days: number | null): Expiry =>
  days === null ? null : (EXPIRY_CHOICES.find((d) => d !== null && d >= days) ?? 365);

/** What the form shows for a saved program. Empty fields stay empty: no sample rewards. */
export function formFrom(p: LoyaltyProgram | undefined): ProgramForm {
  return {
    enabled: p?.enabled ?? false,
    earn: p?.earn.kind ?? 'stamps',
    stamps: p?.stampsRequired ?? 10,
    rewards: [...(p?.rewards ?? [])].sort((a, b) => a.cost - b.cost),
    tiersOn: (p?.tiers.length ?? 0) > 0,
    tiers: p?.tiers.length ? p.tiers : DEFAULT_TIERS,
    cooldown: p?.cooldown ?? '1h',
    welcome: p?.automations?.welcomeReward ?? '',
    birthday: p?.automations?.birthdayReward ?? '',
    winbackDays: p?.automations?.winbackDays ?? 30,
    winback: p?.automations?.winbackReward ?? '',
    stampOnPaid: p?.stampOnPaidOrder ?? true,
    expiryDays: nearestExpiry(p?.expiryDays ?? null),
  };
}

/** The program to save, or the field that needs fixing first. Fields the form does not show are kept. */
export function programFrom(
  p: LoyaltyProgram,
  f: ProgramForm,
): { ok: true; program: LoyaltyProgram } | { ok: false; field: 'reward' } {
  const named = f.rewards.filter((r) => r.title.trim());
  if (f.enabled && named.length === 0) return { ok: false, field: 'reward' };
  const text = (s: string) => s.trim() || undefined;
  const stamps = Math.min(STAMPS.max, Math.max(STAMPS.min, Math.round(f.stamps)));
  const rewards = named
    .map((r, i) => ({
      // New rewards get an id here; the server keeps saved ids.
      id: r.id || `rew_new_${i + 1}`,
      title: r.title.trim(),
      // A reward can never cost more stamps than a full card holds.
      cost: Math.min(stamps, Math.max(1, Math.round(r.cost))),
    }))
    .sort((a, b) => a.cost - b.cost);
  return {
    ok: true,
    program: {
      ...p,
      enabled: f.enabled,
      earn:
        f.earn === 'stamps'
          ? { kind: 'stamps' }
          : p.earn.kind === 'points'
            ? p.earn
            : DEFAULT_POINTS,
      stampsRequired: stamps,
      stampOnPaidOrder: f.stampOnPaid,
      expiryDays: f.expiryDays,
      cooldown: f.cooldown,
      rewards,
      tiers: f.tiersOn ? f.tiers : [],
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
