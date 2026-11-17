// Generated from src/features/loyalty/factsTypes.ts by scripts/sync-server-shared.mjs. Do not edit here.
import { ghanaPhone, isGhanaPhone, isPesewas, type GhanaPhone } from './brand.ts';

export const DAY = 86_400_000;
export const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const TIER_IDS = ['bronze', 'silver', 'gold'] as const;
export type TierId = (typeof TIER_IDS)[number];
export const PROGRESS_STATES = ['empty', 'pending', 'ready', 'one', 'more'] as const;
export type ProgressState = (typeof PROGRESS_STATES)[number];

export const LOYALTY_PROBLEMS = {
  not_a_member: { status: 404, title: 'Not a member yet' },
  programme_off: { status: 409, title: 'This card is not accepting members' },
  currency_mismatch: { status: 409, title: 'That currency does not match the card' },
  reward_unknown: { status: 404, title: 'That reward is not on the card' },
  cannot_afford: { status: 409, title: 'That reward needs more on the card' },
  claim_open: { status: 409, title: 'A code is already waiting for staff' },
  claim_unknown: { status: 404, title: 'That code is not active' },
  claim_expired: { status: 409, title: 'That code has expired' },
  code_taken: { status: 409, title: 'Could not issue a code' },
  programme_invalid: { status: 400, title: 'That programme is not valid' },
  earn_mode_locked: { status: 409, title: 'Members already have earnings, so the earn mode stays' },
  consent_required: { status: 400, title: 'Tick the loyalty box to join' },
} as const;

export type LoyaltyErrorCode = keyof typeof LOYALTY_PROBLEMS;

const venueBrand: unique symbol = Symbol('VenueLoyalty');
declare const minorBrand: unique symbol;
declare const currencyBrand: unique symbol;

export type Minor = number & { readonly [minorBrand]: 'Minor' };
export type CurrencyCode = string & { readonly [currencyBrand]: 'CurrencyCode' };

export type EarnMode =
  | { readonly kind: 'stamps' }
  | { readonly kind: 'points'; readonly points: number; readonly perMinor: number };
export type RewardOffer = { readonly id: string; readonly title: string; readonly cost: number };
export type TierBand = { readonly id: TierId; readonly minLifetime: number };

export type Programme = {
  readonly enabled: boolean;
  readonly currency: CurrencyCode;
  readonly earn: EarnMode;
  readonly tiers: readonly [TierBand, TierBand, TierBand];
  readonly rewards: readonly RewardOffer[];
  readonly expiryDays: number | null;
  readonly claimTtlSeconds: number;
  readonly birthdayTreat: string | null;
};

export type EarnSource =
  | {
      readonly type: 'paid_visit';
      readonly orderId: string;
      readonly amountMinor: Minor;
      readonly currency: CurrencyCode;
    }
  | { readonly type: 'game'; readonly runId: string; readonly day: string }
  | { readonly type: 'birthday'; readonly year: string; readonly title: string };

export type Fact =
  | {
      readonly kind: 'earn';
      readonly id: string;
      readonly at: string;
      readonly units: number;
      readonly source: EarnSource;
    }
  | {
      readonly kind: 'claim';
      readonly id: string;
      readonly at: string;
      readonly code: string;
      readonly rewardId: string;
      readonly title: string;
      readonly units: number;
      readonly expiresAt: string;
    }
  | {
      readonly kind: 'confirm';
      readonly id: string;
      readonly at: string;
      readonly claimId: string;
      readonly rewardId: string;
      readonly title: string;
      readonly units: number;
    };

export type Member = {
  readonly id: string;
  readonly phone: GhanaPhone;
  readonly firstName: string | null;
  readonly birthdayMonthDay: string | null;
  readonly memberSince: string;
  readonly consent: {
    readonly marketing: boolean;
    readonly at: string;
    readonly textVersion: string;
  };
  readonly facts: readonly Fact[];
};

export type VenueLoyalty = {
  readonly [venueBrand]: 'VenueLoyalty';
  readonly venueId: string;
  readonly programme: Programme;
  readonly members: Readonly<Record<string, Member>>;
};

export type Step =
  | {
      readonly ok: true;
      readonly next: VenueLoyalty;
      readonly effect: 'posted' | 'duplicate' | 'skipped';
      readonly memberId: string | null;
    }
  | { readonly ok: false; readonly error: { readonly code: LoyaltyErrorCode } };

export type Command =
  | {
      readonly type: 'join';
      readonly phone: GhanaPhone;
      readonly firstName?: string;
      readonly birthdayMonthDay?: string;
      readonly consent: {
        readonly loyalty: boolean;
        readonly marketing: boolean;
        readonly textVersion: string;
      };
      readonly random: () => number;
    }
  | { readonly type: 'leave'; readonly phone: GhanaPhone }
  | {
      readonly type: 'paid_visit';
      readonly orderId: string;
      readonly amountMinor: Minor;
      readonly currency: CurrencyCode;
      readonly paid: boolean;
      readonly loyaltyPhone: GhanaPhone | null;
      readonly momoPhone: GhanaPhone | null;
    }
  | {
      readonly type: 'game_win';
      readonly phone: GhanaPhone;
      readonly runId: string;
      readonly score: number;
      readonly minScore: number;
      readonly enabled: boolean;
    }
  | {
      readonly type: 'open_claim';
      readonly phone: GhanaPhone;
      readonly rewardId: string;
      readonly random: () => number;
    }
  | { readonly type: 'confirm'; readonly code: string }
  | {
      readonly type: 'save_programme';
      readonly input: unknown;
      readonly venueCurrency: string;
      readonly random: () => number;
    };

export type HistoryRow = {
  readonly at: string;
  readonly source: 'paid_visit' | 'game' | 'birthday' | 'redeem';
  readonly direction: 'in' | 'out';
  readonly units: number;
  readonly title: string | null;
  readonly amountMinor: number | null;
  readonly currency: string | null;
};

export type Wallet = {
  readonly memberId: string;
  readonly guestName: string | null;
  readonly phoneMasked: string;
  readonly memberSince: string;
  readonly tier: TierId;
  readonly progress: {
    readonly kind: 'stamps' | 'points';
    readonly state: ProgressState;
    readonly balance: number;
    readonly lifetime: number;
    readonly nextCost: number | null;
    readonly left: number | null;
  };
  readonly cardNumber: string;
  readonly qrPayload: string;
  readonly catalogue: readonly {
    readonly id: string;
    readonly title: string;
    readonly cost: number;
    readonly affordable: boolean;
  }[];
  readonly liveClaim: {
    readonly code: string;
    readonly expiresAt: string;
    readonly title: string;
    readonly units: number;
  } | null;
  readonly history: readonly HistoryRow[];
};

export function minor(value: number): Minor {
  if (!isPesewas(value)) throw new Error('Money must be a whole number of minor units');
  return value as unknown as Minor;
}

export function currencyCode(value: string): CurrencyCode {
  if (!/^[A-Z]{3}$/.test(value)) throw new Error('Currency must be three letters');
  return value as CurrencyCode;
}

export function samplePhone(value: string): GhanaPhone {
  if (!isGhanaPhone(value)) throw new Error('Sample phone must be Ghana E.164');
  return ghanaPhone(value);
}

export function blankVenue(venueId: string, currency: string): VenueLoyalty {
  const code = currencyCode(currency);
  return brand({
    venueId,
    programme: {
      enabled: false,
      currency: code,
      earn: { kind: 'stamps' },
      tiers: [
        { id: 'bronze', minLifetime: 0 },
        { id: 'silver', minLifetime: 1 },
        { id: 'gold', minLifetime: 2 },
      ],
      rewards: [],
      expiryDays: null,
      claimTtlSeconds: 600,
      birthdayTreat: null,
    },
    members: {},
  });
}

export function brand(value: Omit<VenueLoyalty, typeof venueBrand>): VenueLoyalty {
  return { [venueBrand]: 'VenueLoyalty', ...value };
}

export function unbrand(venue: VenueLoyalty): Omit<VenueLoyalty, typeof venueBrand> {
  return { venueId: venue.venueId, programme: venue.programme, members: venue.members };
}

export function replace(venue: VenueLoyalty, member: Member): VenueLoyalty {
  return brand({ ...unbrand(venue), members: { ...venue.members, [member.id]: member } });
}

export function ok(
  next: VenueLoyalty,
  effect: 'posted' | 'duplicate' | 'skipped',
  memberId: string | null,
): Step {
  return { ok: true, next, effect, memberId };
}

export function fail(code: LoyaltyErrorCode): Step {
  return { ok: false, error: { code } };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function draw(random: () => number, length: number): string {
  let out = '';
  for (let index = 0; index < length; index += 1) {
    const pick = Math.min(ALPHABET.length - 1, Math.floor(random() * ALPHABET.length));
    out += ALPHABET[pick] ?? 'A';
  }
  return out;
}
