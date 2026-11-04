import { createMockClient } from './mockClient';

/** For tests: a mock signed in as Ama, the sample owner, through the same code login the app uses. */
export async function ownerApi(now = Date.now()) {
  let access: string | null = null;
  const api = createMockClient({
    now: () => now,
    tokens: { guest: () => null, access: () => access },
  });
  const phone = '+233240000001';
  await api.requestOtp({ phone, purpose: 'owner_login' }, { idempotencyKey: 'otp-test' });
  access = (await api.verifyOtp({ phone, code: '123456', purpose: 'owner_login' })).accessToken;
  return api;
}
