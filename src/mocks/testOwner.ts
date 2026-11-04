import { createMockClient } from './mockClient';

/**
 * For tests: a mock signed in as Ama, the sample owner, through the same code login the app uses.
 * `setGuest` lets the same mock act as a guest at a table too.
 */
export async function signedInMock(now = Date.now()) {
  let access: string | null = null;
  let guest: string | null = null;
  const api = createMockClient({
    now: () => now,
    tokens: { guest: () => guest, access: () => access },
  });
  const phone = '+233240000001';
  await api.requestOtp({ phone, purpose: 'owner_login' }, { idempotencyKey: 'otp-test' });
  access = (await api.verifyOtp({ phone, code: '123456', purpose: 'owner_login' })).accessToken;
  return { api, setGuest: (token: string) => (guest = token) };
}

export async function ownerApi(now = Date.now()) {
  return (await signedInMock(now)).api;
}
