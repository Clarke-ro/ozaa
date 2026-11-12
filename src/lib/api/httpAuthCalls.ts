import type { ApiClient } from './client';
import { problem, type HttpContext } from './httpContext';

/** Real-server calls: sign-in, tokens, the guest session and deleting an account. */
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
    refreshTokens: (body) => ok(client.POST('/auth/refresh', { body })),
    async logout() {
      const result = await client.POST('/auth/logout', { headers: headers('access') });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    getMe: () => ok(client.GET('/me', { headers: headers('access') })),
    createGuestSession: (body) => ok(client.POST('/guest-sessions', { body })),
    async deleteAccount(body) {
      const result = await client.DELETE('/auth/account', { body, headers: headers('access') });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
  } satisfies Partial<ApiClient>;
}
