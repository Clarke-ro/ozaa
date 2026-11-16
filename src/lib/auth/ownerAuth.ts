import { ApiError } from '@/lib/api/errors';

/**
 * How owners and staff sign in. Clerk does this in real builds (BUILD.md section 4): it texts the
 * code, keeps the session and hands out a short-lived token for owner calls. The mock does the same
 * with the demo code 123456. The screens only ever see this shape, so swapping one for the other
 * changes no screen.
 *
 * Errors are ApiErrors with the codes the screens already know: 401 `bad_code`, 429 `rate_limited`.
 */
export type OwnerAuth = {
  /**
   * What people sign in with. Real builds use an email code for now, because Clerk won't text
   * Ghana numbers yet (2026-11-16); the demo keeps its sample phone numbers.
   */
  identifier: 'phone' | 'email';
  /** Sends a 6-digit code to the phone (+233…) or email, whichever `identifier` says. */
  sendCode(identifier: string): Promise<void>;
  /** Checks the code sent by sendCode. Afterwards getToken() gives a token for owner calls. */
  verifyCode(code: string): Promise<void>;
  /**
   * The token for the `ownerAuth` header, or null when nobody is signed in. Clerk's token lasts
   * about a minute; `fresh` asks for a new one after the server said the old one expired.
   */
  getToken(options?: { fresh?: boolean }): Promise<string | null>;
  signOut(): Promise<void>;
  /** Changing the sign-in number: a code goes to the new number first. */
  sendPhoneChangeCode(phone: string): Promise<void>;
  /** The number changes only once this code is right. GET /me shows the new number afterwards. */
  confirmPhoneChange(code: string): Promise<void>;
};

/**
 * Real-server builds until the Clerk screens land (the next PR): sign-in says plainly that it
 * isn't ready instead of failing in a confusing way.
 */
export const notReadyAuth: OwnerAuth = {
  identifier: 'email',
  sendCode: notReady,
  verifyCode: notReady,
  getToken: async () => null,
  signOut: async () => undefined,
  sendPhoneChangeCode: notReady,
  confirmPhoneChange: notReady,
};

async function notReady(): Promise<never> {
  throw new ApiError(503, 'auth_not_ready', 'Sign-in is not set up in this build yet');
}
