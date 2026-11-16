import type {
  GuestPayMethods,
  ManualPayments,
  PaymentSettings,
  PaystackKeysInput,
  VenuePublic,
} from '@/lib/api/types';
import { isGhanaPhone } from '@/lib/brand';

// Paystack keys: pk_ or sk_, then test_ or live_, then letters and digits.
const PUBLIC = /^pk_(test|live)_[A-Za-z0-9]{10,}$/;
const SECRET = /^sk_(test|live)_[A-Za-z0-9]{10,}$/;

export type KeysCheck =
  | { ok: true }
  | { ok: false; code: 'paystack_keys_invalid' | 'paystack_mode_mismatch' | 'live_not_enabled' };

/**
 * The shape check before anything is sent to Paystack. `liveAllowed` stays false until Clarke
 * turns on real money (AGENTS.md: test keys only). The server also asks Paystack itself.
 */
export function checkPaystackKeys(input: PaystackKeysInput, liveAllowed: boolean): KeysCheck {
  const publicKey = PUBLIC.exec(input.publicKey.trim());
  const secretKey = SECRET.exec(input.secretKey.trim());
  if (!publicKey || !secretKey) return { ok: false, code: 'paystack_keys_invalid' };
  if (publicKey[1] !== input.mode || secretKey[1] !== input.mode)
    return { ok: false, code: 'paystack_mode_mismatch' };
  if (input.mode === 'live' && !liveAllowed) return { ok: false, code: 'live_not_enabled' };
  return { ok: true };
}

/** What we show instead of the secret key: dots and its last 4 characters. */
export function keyHint(secretKey: string): string {
  return `••••${secretKey.trim().slice(-4)}`;
}

export type ManualCheck = { ok: true } | { ok: false; field: 'bank' | 'momo' };

/** A method that's switched on needs what guests need to use it. */
export function checkManualPayments(manual: ManualPayments): ManualCheck {
  const bank = manual.bankTransfer;
  if (bank.enabled && (!bank.accountName?.trim() || !bank.accountNumber?.trim()))
    return { ok: false, field: 'bank' };
  const momo = manual.momo;
  if (momo.enabled && (!momo.network || !momo.number || !isGhanaPhone(momo.number)))
    return { ok: false, field: 'momo' };
  return { ok: true };
}

/** What guests are told about paying. Never includes a key, only whether online pay works. */
export function guestPayMethods(settings: PaymentSettings): GuestPayMethods {
  const { bankTransfer, momo } = settings.manual;
  // The fee share only matters for payments in the app, so it's left out when there are none.
  const passing = settings.paystack && settings.feePassing?.enabled ? settings.feePassing : null;
  return {
    online: settings.paystack !== null,
    testMode: settings.paystack?.mode === 'test',
    ...(passing ? { feePercent: passing.percent } : {}),
    cash: settings.manual.cash,
    cardMachine: settings.manual.cardMachine,
    bankTransfer:
      bankTransfer.enabled && bankTransfer.accountNumber
        ? {
            bankName: bankTransfer.bankName ?? '',
            accountName: bankTransfer.accountName ?? '',
            accountNumber: bankTransfer.accountNumber,
          }
        : null,
    momo:
      momo.enabled && momo.number && momo.network
        ? { network: momo.network, number: momo.number, name: momo.name ?? '' }
        : null,
  };
}

/**
 * True when guests can pay in the app: the venue's own Paystack is connected. Otherwise they pay
 * in person and staff mark the order paid (BUILD.md 4b.17).
 */
export function canPayOnline(venue: Pick<VenuePublic, 'payMethods'> | undefined): boolean {
  return venue?.payMethods?.online === true;
}
