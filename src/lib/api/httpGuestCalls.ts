import type { ApiClient } from './client';
import { problem, type HttpContext } from './httpContext';

/** Real-server calls: what a guest does: menu, order, bill, pay, waiter, loyalty card, reviews, game, feedback. */
export function httpGuestCalls({ client, headers, ok }: HttpContext) {
  return {
    getVenue: (slug, call) =>
      ok(
        client.GET('/venues/{venueSlug}', {
          params: { path: { venueSlug: slug } },
          headers: headers('guest', call),
        }),
      ),
    getMenu: (slug, call) =>
      ok(
        client.GET('/venues/{venueSlug}/menu', {
          params: { path: { venueSlug: slug } },
          headers: headers('guest', call),
        }),
      ),
    getWifi: (slug) =>
      ok(client.GET('/venues/{venueSlug}/wifi', { params: { path: { venueSlug: slug } } })),
    listOffers: (slug) =>
      ok(client.GET('/venues/{venueSlug}/offers', { params: { path: { venueSlug: slug } } })),
    createOrder: (body, call) =>
      ok(
        client.POST('/orders', {
          body,
          params: { header: { 'Idempotency-Key': call.idempotencyKey ?? '' } },
          // A paid order can earn a stamp: the loyalty token, if any, rides beside the guest token.
          headers: headers('guest', { ...call, withLoyalty: true }),
        }),
      ),
    getOrder: (orderId, call) =>
      ok(
        client.GET('/orders/{orderId}', {
          params: { path: { orderId } },
          headers: headers('guest', call),
        }),
      ),
    quoteBill: (orderId, body) =>
      ok(
        client.POST('/orders/{orderId}/bill', {
          body,
          params: { path: { orderId } },
          headers: headers('guest'),
        }),
      ),
    initializePayment: (body, call) =>
      ok(
        client.POST('/payments', {
          body,
          params: { header: { 'Idempotency-Key': call.idempotencyKey ?? '' } },
          headers: headers('guest', call),
        }),
      ),
    getPayment: (reference) =>
      ok(
        client.GET('/payments/{reference}', {
          params: { path: { reference } },
          headers: headers('guest'),
        }),
      ),
    verifyPayment: (reference) =>
      ok(
        client.POST('/payments/{reference}/verify', {
          params: { path: { reference } },
          headers: headers('guest'),
        }),
      ),
    callWaiter: (body, call) =>
      ok(
        client.POST('/waiter-calls', {
          body,
          params: { header: { 'Idempotency-Key': call.idempotencyKey ?? '' } },
          headers: headers('guest', call),
        }),
      ),
    getWaiterCall: (id) =>
      ok(
        client.GET('/waiter-calls/{waiterCallId}', {
          params: { path: { waiterCallId: id } },
          headers: headers('guest'),
        }),
      ),
    getVenueLoyaltyProgram: (slug) =>
      ok(client.GET('/venues/{venueSlug}/loyalty', { params: { path: { venueSlug: slug } } })),
    getMyLoyaltyCard: (slug) =>
      ok(
        client.GET('/venues/{venueSlug}/loyalty/me', {
          params: { path: { venueSlug: slug } },
          headers: headers('loyalty'),
        }),
      ),
    joinLoyalty: (slug, body) =>
      ok(
        client.PUT('/venues/{venueSlug}/loyalty/me', {
          body,
          params: { path: { venueSlug: slug } },
          headers: headers('loyalty'),
        }),
      ),
    async leaveLoyalty(slug) {
      const result = await client.DELETE('/venues/{venueSlug}/loyalty/me', {
        params: { path: { venueSlug: slug } },
        headers: headers('loyalty'),
      });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    redeemReward: (slug, body, call) =>
      ok(
        client.POST('/venues/{venueSlug}/loyalty/me/redeem', {
          body,
          params: {
            path: { venueSlug: slug },
            header: { 'Idempotency-Key': call.idempotencyKey ?? '' },
          },
          headers: headers('loyalty', call),
        }),
      ),
    createReview: (body, call) =>
      ok(
        client.POST('/reviews', {
          body,
          params: { header: { 'Idempotency-Key': call.idempotencyKey ?? '' } },
          headers: headers('guest', call),
        }),
      ),
    getLeaderboard: (slug) =>
      ok(
        client.GET('/venues/{venueSlug}/game/leaderboard', {
          params: { path: { venueSlug: slug } },
        }),
      ),
    submitScore: (slug, body) =>
      ok(
        client.POST('/venues/{venueSlug}/game/scores', {
          body,
          params: { path: { venueSlug: slug } },
          // The guest token proves the visit; the loyalty token, if any, lets a win earn a stamp.
          headers: headers('guest', { withLoyalty: true }),
        }),
      ),
    async sendFeedback(body) {
      const result = await client.POST('/feedback', { body, headers: headers('guest') });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
  } satisfies Partial<ApiClient>;
}
