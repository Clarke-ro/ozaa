import { ApiError } from '@/lib/api/errors';
import type { OwnerAuth } from './ownerAuth';

type Factor = { strategy: string; phoneNumberId?: string };
type SignInAttempt = {
  supportedFirstFactors: Factor[] | null;
  prepareFirstFactor: (params: {
    strategy: 'phone_code';
    phoneNumberId: string;
  }) => Promise<unknown>;
  attemptFirstFactor: (params: {
    strategy: 'phone_code';
    code: string;
  }) => Promise<{ status: string | null; createdSessionId: string | null }>;
};
type NewPhone = {
  id: string;
  prepareVerification: () => Promise<unknown>;
  attemptVerification: (params: { code: string }) => Promise<unknown>;
};

/**
 * The few parts of Clerk our sign-in uses. Clerk's own object has all of these; tests pass a
 * small fake with the same shape, so no test needs Clerk's servers.
 */
export type ClerkLike = {
  loaded: boolean;
  client:
    { signIn: { create: (params: { identifier: string }) => Promise<SignInAttempt> } } | undefined;
  session:
    { getToken: (options?: { skipCache?: boolean }) => Promise<string | null> } | null | undefined;
  user:
    | {
        phoneNumbers: { id: string; destroy: () => Promise<void> }[];
        createPhoneNumber: (params: { phoneNumber: string }) => Promise<NewPhone>;
        update: (params: { primaryPhoneNumberId: string }) => Promise<unknown>;
      }
    | null
    | undefined;
  setActive: (params: { session: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Clerk's errors in the words our screens already know. Every code problem is the same 401, so
 * the screen says one thing ("That code didn't work") whether the number is unknown, the code is
 * wrong or it expired: nobody can use the screen to find out which numbers have an account.
 */
function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const e = error as { status?: number; errors?: { code?: string }[] };
  const code = e?.errors?.[0]?.code;
  if (e?.status === 429 || code === 'too_many_requests')
    return new ApiError(429, 'rate_limited', 'Too many tries');
  if (code === 'form_identifier_exists')
    return new ApiError(409, 'phone_taken', 'Someone already signs in with that number');
  if (code?.startsWith('form_') || code?.startsWith('verification_'))
    return new ApiError(401, 'bad_code', 'That code is wrong');
  return new ApiError(503, 'auth_unavailable', 'Sign-in is not answering. Try again.');
}

const badCode = () => new ApiError(401, 'bad_code', 'That code is wrong');

/**
 * Owner and staff sign-in through Clerk (BUILD.md section 4), behind the same OwnerAuth the mock
 * fills in, so the screens don't change. `getClerk` waits until Clerk has loaded.
 */
export function clerkOwnerAuth(getClerk: () => Promise<ClerkLike>): OwnerAuth {
  let attempt: SignInAttempt | null = null;
  let newPhone: NewPhone | null = null;

  const run = async <T>(work: (clerk: ClerkLike) => Promise<T>): Promise<T> => {
    try {
      return await work(await getClerk());
    } catch (error) {
      throw toApiError(error);
    }
  };

  return {
    sendCode: (phone) =>
      run(async (clerk) => {
        if (!clerk.client) throw new ApiError(503, 'auth_unavailable', 'Sign-in is not ready');
        attempt = await clerk.client.signIn.create({ identifier: phone });
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === 'phone_code');
        // With strict enumeration protection an unknown number gets no phone factor and no SMS.
        // We still move on to the code step, so the screen looks the same either way.
        if (factor?.phoneNumberId) {
          await attempt.prepareFirstFactor({
            strategy: 'phone_code',
            phoneNumberId: factor.phoneNumberId,
          });
        }
      }),
    verifyCode: (code) =>
      run(async (clerk) => {
        if (!attempt?.supportedFirstFactors?.some((f) => f.strategy === 'phone_code'))
          throw badCode();
        const result = await attempt.attemptFirstFactor({ strategy: 'phone_code', code });
        if (result.status !== 'complete' || !result.createdSessionId) throw badCode();
        await clerk.setActive({ session: result.createdSessionId });
        attempt = null;
      }),
    getToken: (options) =>
      run(async (clerk) => (await clerk.session?.getToken({ skipCache: options?.fresh })) ?? null),
    signOut: () => run((clerk) => clerk.signOut()),
    sendPhoneChangeCode: (phone) =>
      run(async (clerk) => {
        if (!clerk.user) throw new ApiError(401, 'unauthorized', 'Sign in again');
        newPhone = await clerk.user.createPhoneNumber({ phoneNumber: phone });
        await newPhone.prepareVerification();
      }),
    confirmPhoneChange: (code) =>
      run(async (clerk) => {
        const user = clerk.user;
        if (!user || !newPhone) throw badCode();
        await newPhone.attemptVerification({ code });
        const keep = newPhone.id;
        await user.update({ primaryPhoneNumberId: keep });
        // One number per person: the old one stops working for sign-in. If removing it fails, the
        // new number is already the one in use, so the change still stands.
        await Promise.all(
          user.phoneNumbers
            .filter((p) => p.id !== keep)
            .map((p) => p.destroy().catch(() => undefined)),
        );
        newPhone = null;
      }),
  };
}
