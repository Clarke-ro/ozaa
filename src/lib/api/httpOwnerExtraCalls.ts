import type { ApiClient } from './client';
import { problem, type HttpContext } from './httpContext';

/** Real-server calls: promos, notifications, one loyalty customer, the scan log and the profile. */
export function httpOwnerExtraCalls({ client, headers, ok }: HttpContext) {
  const access = () => headers('access');
  return {
    ownerListPromos: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/promos', {
          params: { path: { venueId } },
          headers: access(),
        }),
      ),
    ownerCreatePromo: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/promos', {
          body,
          params: { path: { venueId } },
          headers: access(),
        }),
      ),
    ownerUpdatePromo: (venueId, promoId, body) =>
      ok(
        client.PATCH('/owner/venues/{venueId}/promos/{promoId}', {
          body,
          params: { path: { venueId, promoId } },
          headers: access(),
        }),
      ),
    ownerDeletePromo: async (venueId, promoId) => {
      await ok(
        client.DELETE('/owner/venues/{venueId}/promos/{promoId}', {
          params: { path: { venueId, promoId } },
          headers: access(),
        }),
      );
    },
    ownerListNotifications: (venueId, query) =>
      ok(
        client.GET('/owner/venues/{venueId}/notifications', {
          params: { path: { venueId }, query: query ?? {} },
          headers: access(),
        }),
      ),
    ownerMarkNotificationsRead: (venueId, ids) =>
      ok(
        client.POST('/owner/venues/{venueId}/notifications/read', {
          body: ids ? { ids } : {},
          params: { path: { venueId } },
          headers: access(),
        }),
      ),
    ownerGetLoyaltyCustomer: (venueId, customerId) =>
      ok(
        client.GET('/owner/venues/{venueId}/loyalty/customers/{customerId}', {
          params: { path: { venueId, customerId } },
          headers: access(),
        }),
      ),
    async ownerRemoveLoyaltyCustomer(venueId, customerId) {
      const result = await client.DELETE('/owner/venues/{venueId}/loyalty/customers/{customerId}', {
        params: { path: { venueId, customerId } },
        headers: access(),
      });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    ownerStampLoyaltyCustomer: (venueId, customerId, call) =>
      ok(
        client.POST('/owner/venues/{venueId}/loyalty/customers/{customerId}/stamp', {
          params: {
            path: { venueId, customerId },
            header: { 'Idempotency-Key': call?.idempotencyKey ?? '' },
          },
          headers: headers('access', call),
        }),
      ),
    ownerListLoyaltyScans: (venueId, since) =>
      ok(
        client.GET('/owner/venues/{venueId}/loyalty/scans', {
          params: { path: { venueId }, query: since ? { since } : {} },
          headers: access(),
        }),
      ),
    updateMyProfile: (body) => ok(client.PATCH('/me/profile', { body, headers: access() })),
  } satisfies Partial<ApiClient>;
}
