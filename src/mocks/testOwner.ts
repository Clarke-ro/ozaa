import { createMockClient } from './mockClient';

/**
 * For tests: a mock signed in as Ama, the sample owner, through the same code login the app uses.
 * `setGuest` lets the same mock act as a guest at a table too.
 */
/** `phone` picks the staff member: Ama (owner) by default, +233240000002 Kwesi (waiter), …03 Yaw (kitchen). */
export async function signedInMock(now = Date.now(), phone = '+233240000001') {
  let access: string | null = null;
  let guest: string | null = null;
  const api = createMockClient({
    now: () => now,
    tokens: { guest: () => guest, access: () => access },
  });
  await api.requestOtp({ phone, purpose: 'owner_login' }, { idempotencyKey: 'otp-test' });
  access = (await api.verifyOtp({ phone, code: '123456', purpose: 'owner_login' })).accessToken;
  return { api, setGuest: (token: string) => (guest = token) };
}

export async function ownerApi(now = Date.now()) {
  return (await signedInMock(now)).api;
}
