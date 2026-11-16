import type { ApiClient } from './client';
import { problem, type HttpContext } from './httpContext';

/** Real-server calls: the loyalty code, who is signed in, the guest session and deleting an account. */
export function httpAuthCalls({ client, headers, ok }: HttpContext) {
  return {
    requestOtp: (body, call) =>
      ok(
        client.POST('/auth/otp/request', {
          body,
          params: { header: { 'Idempotency-Key': call?.idempotencyKey ?? '' } },
        }),
      ),
    verifyOtp: (body) => ok(client.POST('/auth/otp/verify', { body })),
    getMe: () => ok(client.GET('/me', { headers: headers('access') })),
    createGuestSession: (body) => ok(client.POST('/guest-sessions', { body })),
    async deleteAccount(body) {
      const result = await client.DELETE('/auth/account', { body, headers: headers('access') });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
  } satisfies Partial<ApiClient>;
}
