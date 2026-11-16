import { createMockApi } from './mockClient';

/**
 * For tests: a mock signed in as Ama, the sample owner, through the mock's stand-in for Clerk.
 * `setGuest` lets the same mock act as a guest at a table too.
 */
/** `phone` picks the staff member: Ama (owner) by default, +233240000002 Kwesi (waiter), …03 Yaw (kitchen). */
export async function signedInMock(now = Date.now(), phone = '+233240000001') {
  let access: string | null = null;
  let guest: string | null = null;
  const { api, auth } = createMockApi({
    now: () => now,
    tokens: { guest: () => guest, access: () => access },
  });
  await auth.sendCode(phone);
  await auth.verifyCode('123456');
  access = await auth.getToken();
  return { api, auth, setGuest: (token: string) => (guest = token) };
}

export async function ownerApi(now = Date.now()) {
  return (await signedInMock(now)).api;
}
