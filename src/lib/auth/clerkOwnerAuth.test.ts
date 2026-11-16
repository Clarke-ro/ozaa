import { ApiError } from '@/lib/api/errors';
import { clerkOwnerAuth, type ClerkLike } from './clerkOwnerAuth';

/** A stand-in for Clerk with the few calls our sign-in uses. */
function fakeClerk(options: { knownPhone?: string; code?: string } = {}) {
  const code = options.code ?? '424242';
  const calls: string[] = [];
  const clerkError = (status: number, errorCode: string) =>
    Object.assign(new Error(errorCode), { status, errors: [{ code: errorCode }] });
  let attempts = 0;
  const strategies: string[] = [];
  const phones = [{ id: 'idn_old', destroy: async () => void calls.push('destroy idn_old') }];
  const clerk: ClerkLike = {
    loaded: true,
    client: {
      signIn: {
        create: async ({ identifier }) => {
          calls.push(`create ${identifier}`);
          const known = identifier === (options.knownPhone ?? identifier);
          return {
            supportedFirstFactors: known
              ? [
                  { strategy: 'phone_code', phoneNumberId: 'idn_1' },
                  { strategy: 'email_code', emailAddressId: 'idn_mail' },
                ]
              : [],
            prepareFirstFactor: async (params) => {
              calls.push('prepare');
              strategies.push(params.strategy);
            },
            attemptFirstFactor: async (params) => {
              attempts += 1;
              if (attempts > 3) throw clerkError(429, 'too_many_requests');
              if (params.code !== code) throw clerkError(422, 'form_code_incorrect');
              return { status: 'complete', createdSessionId: 'sess_1' };
            },
          };
        },
      },
    },
    session: null,
    user: {
      phoneNumbers: phones,
      createPhoneNumber: async ({ phoneNumber }) => {
        if (phoneNumber === '+233249999999') throw clerkError(422, 'form_identifier_exists');
        calls.push(`add ${phoneNumber}`);
        return {
          id: 'idn_new',
          prepareVerification: async () => void calls.push('send to new'),
          attemptVerification: async (params) => {
            if (params.code !== code) throw clerkError(422, 'form_code_incorrect');
          },
        };
      },
      update: async (params) => void calls.push(`primary ${params.primaryPhoneNumberId}`),
    },
    setActive: async ({ session }) => {
      calls.push(`active ${session}`);
      clerk.session = { getToken: async (o) => (o?.skipCache ? 'jwt_fresh' : 'jwt_1') };
    },
    signOut: async () => {
      calls.push('sign out');
      clerk.session = null;
    },
  };
  return { clerk, calls, strategies };
}

test("the right code signs in with Clerk, and owner calls get Clerk's token", async () => {
  const { clerk, calls } = fakeClerk();
  const auth = clerkOwnerAuth(async () => clerk);
  await auth.sendCode('+233241234567');
  await auth.verifyCode('424242');
  expect(calls).toEqual(['create +233241234567', 'prepare', 'active sess_1']);
  expect(await auth.getToken()).toBe('jwt_1');
  expect(await auth.getToken({ fresh: true })).toBe('jwt_fresh');
  await auth.signOut();
  expect(await auth.getToken()).toBeNull();
});

test("a wrong code is 401 bad_code, and Clerk's limit is 429", async () => {
  const { clerk } = fakeClerk();
  const auth = clerkOwnerAuth(async () => clerk);
  await auth.sendCode('+233241234567');
  await expect(auth.verifyCode('000000')).rejects.toMatchObject({ status: 401, code: 'bad_code' });
  await auth.verifyCode('000000').catch(() => undefined);
  await auth.verifyCode('000000').catch(() => undefined);
  await expect(auth.verifyCode('424242')).rejects.toMatchObject({
    status: 429,
    code: 'rate_limited',
  });
});

test('real builds sign in by email code (Clerk keeps SMS to Ghana locked); the demo can still use phone', async () => {
  const email = fakeClerk();
  const byEmail = clerkOwnerAuth(async () => email.clerk);
  expect(byEmail.identifier).toBe('email');
  await byEmail.sendCode(' owner@example.com ');
  await byEmail.verifyCode('424242');
  expect(email.calls[0]).toBe('create owner@example.com');
  expect(email.strategies).toEqual(['email_code']);

  const phone = fakeClerk();
  const byPhone = clerkOwnerAuth(async () => phone.clerk, 'phone');
  await byPhone.sendCode('+233241234567');
  expect(phone.strategies).toEqual(['phone_code']);
});

test('an unknown number looks the same as a known one until the code fails (no probing)', async () => {
  const { clerk, calls } = fakeClerk({ knownPhone: '+233241234567' });
  const auth = clerkOwnerAuth(async () => clerk);
  await expect(auth.sendCode('+233240000999')).resolves.toBeUndefined();
  expect(calls).not.toContain('prepare');
  await expect(auth.verifyCode('424242')).rejects.toMatchObject({ status: 401, code: 'bad_code' });
});

test('changing the number: code to the new one, then it becomes primary and the old one goes', async () => {
  const { clerk, calls } = fakeClerk();
  const auth = clerkOwnerAuth(async () => clerk);
  await auth.sendPhoneChangeCode('+233245550000');
  await expect(auth.confirmPhoneChange('111111')).rejects.toBeInstanceOf(ApiError);
  await auth.confirmPhoneChange('424242');
  expect(calls).toEqual(['add +233245550000', 'send to new', 'primary idn_new', 'destroy idn_old']);
});

test('a number someone else signs in with is 409 phone_taken', async () => {
  const { clerk } = fakeClerk();
  const auth = clerkOwnerAuth(async () => clerk);
  await expect(auth.sendPhoneChangeCode('+233249999999')).rejects.toMatchObject({
    status: 409,
    code: 'phone_taken',
  });
});
