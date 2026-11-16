import type { OwnerAuth } from '@/lib/auth/ownerAuth';
import { ApiError } from '@/lib/api/errors';
import { isGhanaPhone } from '@/lib/brand';
import { DEMO_CODE } from './demo';
import { profileOf } from './mockAuthCalls';
import type { MockContext } from './mockContext';
import { STAFF } from './world';

/**
 * The mock's stand-in for Clerk. Any Ghana number gets a "code"; the code is always 123456. Three
 * wrong codes in a row give 429, like Clerk's own limit. Signing in puts a token in the mock world
 * that the owner calls accept, the way the server will accept Clerk's token.
 */
export function mockOwnerAuth(ctx: MockContext): OwnerAuth {
  const { world, gate } = ctx;
  let pendingPhone: string | null = null;
  let token: string | null = null;
  let changeTo: string | null = null;

  const signedInPhone = () => {
    const row = token ? world.access.get(token) : undefined;
    if (!row) throw new ApiError(401, 'unauthorized', 'Sign in again');
    return row.phone;
  };

  return {
    async sendCode(phone) {
      await gate();
      if (!isGhanaPhone(phone)) throw new ApiError(400, 'phone_not_valid', 'Check the number');
      pendingPhone = phone;
    },
    async verifyCode(code) {
      await gate();
      const phone = pendingPhone;
      if (!phone) throw new ApiError(400, 'no_code_sent', 'Ask for a code first');
      const fails = world.otpFails.get(phone) ?? 0;
      if (fails >= 3) throw new ApiError(429, 'rate_limited', 'Too many tries');
      if (code !== DEMO_CODE) {
        world.otpFails.set(phone, fails + 1);
        throw new ApiError(401, 'bad_code', 'That code is wrong');
      }
      world.otpFails.set(phone, 0);
      token = `acc_owner_login_${phone}`;
      world.access.set(token, { phone, purpose: 'owner_login' });
      pendingPhone = null;
    },
    async getToken() {
      return token && world.access.has(token) ? token : null;
    },
    async signOut() {
      if (token) world.access.delete(token);
      token = null;
    },
    async sendPhoneChangeCode(phone) {
      await gate();
      const current = signedInPhone();
      if (!isGhanaPhone(phone)) throw new ApiError(400, 'phone_not_valid', 'Check the number');
      if (STAFF.some((person) => person.phone === phone) && phone !== current)
        throw new ApiError(409, 'phone_taken', 'Someone already signs in with that number');
      changeTo = phone;
    },
    async confirmPhoneChange(code) {
      await gate();
      const current = signedInPhone();
      if (!changeTo || code !== DEMO_CODE)
        throw new ApiError(401, 'code_wrong', 'That code is not right');
      // The mock keeps the profile under the first number, as Clerk keeps the same user id.
      world.profiles.set(current, { ...profileOf(world, current), phone: changeTo });
      changeTo = null;
    },
  };
}
