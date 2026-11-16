import { z } from 'zod';
import type { PaystackTransaction } from './status.ts';

export class PaystackError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
  }
}

const envelope = z.object({ status: z.boolean(), message: z.string(), data: z.unknown() });
const chargeData = z.object({
  status: z.string(),
  reference: z.string(),
  display_text: z.string().optional(),
});
const initData = z.object({ authorization_url: z.string().url(), reference: z.string() });
const txData = z.object({
  status: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  gateway_response: z.string().nullish().transform((v) => v ?? undefined),
});

export type Paystack = ReturnType<typeof paystackClient>;

/**
 * The three Paystack calls the sandbox slice needs. The secret key goes in the Authorization header
 * and nowhere else. Amounts are in pesewas, which is what Paystack expects for GHS.
 * Every answer is checked with zod: we never act on a shape we didn't expect.
 */
export function paystackClient(secret: string, fetchFn: typeof fetch = fetch, base = 'https://api.paystack.co') {
  const call = async (path: string, init: { method: 'GET' | 'POST'; body?: unknown }) => {
    const res = await fetchFn(`${base}${path}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const parsed = envelope.safeParse(await res.json().catch(() => null));
    if (!res.ok || !parsed.success || !parsed.data.status) {
      throw new PaystackError(parsed.success ? parsed.data.message : 'Unexpected Paystack reply', res.status);
    }
    return parsed.data.data;
  };

  return {
    /** MoMo: Paystack sends the approval prompt to the phone and answers pay_offline. */
    async chargeMomo(input: {
      email: string;
      amountPesewas: number;
      reference: string;
      phone: string;
      provider: 'mtn' | 'vod' | 'atl';
    }) {
      const data = await call('/charge', {
        method: 'POST',
        body: {
          email: input.email,
          amount: input.amountPesewas,
          currency: 'GHS',
          reference: input.reference,
          mobile_money: { phone: localPhone(input.phone), provider: input.provider },
        },
      });
      return chargeData.parse(data);
    },

    /** Card: Paystack's own checkout page, which sends the guest back to `callbackUrl`. */
    async initializeCard(input: {
      email: string;
      amountPesewas: number;
      reference: string;
      callbackUrl: string;
    }) {
      const data = await call('/transaction/initialize', {
        method: 'POST',
        body: {
          email: input.email,
          amount: input.amountPesewas,
          currency: 'GHS',
          reference: input.reference,
          callback_url: input.callbackUrl,
          channels: ['card'],
        },
      });
      return initData.parse(data);
    },

    /**
     * Checks a secret key without moving money: listing one transaction only works with a real
     * key. Throws PaystackError (401) when Paystack refuses it.
     */
    async checkKey(): Promise<void> {
      await call('/transaction?perPage=1', { method: 'GET' });
    },

    async verify(reference: string): Promise<PaystackTransaction> {
      const data = await call(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
      return txData.parse(data);
    },
  };
}

/** Our phones are +233XXXXXXXXX; Paystack's MoMo examples use the local 0XXXXXXXXX form. */
export function localPhone(e164: string): string {
  return e164.startsWith('+233') ? `0${e164.slice(4)}` : e164;
}
