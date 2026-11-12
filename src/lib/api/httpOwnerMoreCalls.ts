import type { ApiClient } from './client';
import { problem, type HttpContext } from './httpContext';

/** Real-server calls: loyalty, reviews, sales, feedback, custom links, locations and scanner devices. */
export function httpOwnerMoreCalls({ client, headers, ok }: HttpContext) {
  return {
    ownerGetLoyalty: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/loyalty', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerSetLoyalty: (venueId, body) =>
      ok(
        client.PUT('/owner/venues/{venueId}/loyalty', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerListLoyaltyMembers: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/loyalty/members', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerConfirmRedemption: (venueId, body, call) =>
      ok(
        client.POST('/owner/venues/{venueId}/loyalty/confirm', {
          body,
          params: { path: { venueId }, header: { 'Idempotency-Key': call?.idempotencyKey ?? '' } },
          headers: headers('access', call),
        }),
      ),
    ownerGetLoyaltyAnalytics: (venueId, range) =>
      ok(
        client.GET('/owner/venues/{venueId}/loyalty/analytics', {
          params: { path: { venueId }, query: range ? { range } : {} },
          headers: headers('access'),
        }),
      ),
    ownerListLoyaltyCustomers: (venueId, query) =>
      ok(
        client.GET('/owner/venues/{venueId}/loyalty/customers', {
          params: { path: { venueId }, query: query ?? {} },
          headers: headers('access'),
        }),
      ),
    ownerScanLoyaltyCard: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/loyalty/scan', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerListWrittenReviews: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/written-reviews', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerReplyToReview: (reviewId, body, call) =>
      ok(
        client.POST('/owner/written-reviews/{writtenReviewId}/reply', {
          body,
          params: {
            path: { writtenReviewId: reviewId },
            header: { 'Idempotency-Key': call?.idempotencyKey ?? '' },
          },
          headers: headers('access', call),
        }),
      ),
    ownerGetSales: (venueId, filter) =>
      ok(
        client.GET('/owner/venues/{venueId}/sales', {
          params: { path: { venueId }, query: { since: filter?.since, until: filter?.until } },
          headers: headers('access'),
        }),
      ),
    ownerGetInsights: (venueId, range, window) =>
      ok(
        client.GET('/owner/venues/{venueId}/insights', {
          params: { path: { venueId }, query: { ...(range ? { range } : {}), ...(window ?? {}) } },
          headers: headers('access'),
        }),
      ),
    ownerListFeedback: (venueId, query) =>
      ok(
        client.GET('/owner/venues/{venueId}/feedback', {
          params: { path: { venueId }, query: query ?? {} },
          headers: headers('access'),
        }),
      ),
    ownerArchiveFeedback: (venueId, feedbackId, body) =>
      ok(
        client.PATCH('/owner/venues/{venueId}/feedback/{feedbackId}/archive', {
          body,
          params: { path: { venueId, feedbackId } },
          headers: headers('access'),
        }),
      ),
    ownerAskFeedbackAi: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/feedback/ask', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerListCustomLinks: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/links', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerCreateCustomLink: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/links', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerUpdateCustomLink: (venueId, linkId, body) =>
      ok(
        client.PATCH('/owner/venues/{venueId}/links/{linkId}', {
          body,
          params: { path: { venueId, linkId } },
          headers: headers('access'),
        }),
      ),
    async ownerDeleteCustomLink(venueId, linkId) {
      const result = await client.DELETE('/owner/venues/{venueId}/links/{linkId}', {
        params: { path: { venueId, linkId } },
        headers: headers('access'),
      });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    ownerGetBusiness: () => ok(client.GET('/owner/business', { headers: headers('access') })),
    ownerUpdateBusiness: (body) =>
      ok(client.PATCH('/owner/business', { body, headers: headers('access') })),
    ownerCreateLocation: (body) =>
      ok(client.POST('/owner/business/locations', { body, headers: headers('access') })),
    ownerUpdateLocation: (locationId, body) =>
      ok(
        client.PATCH('/owner/business/locations/{locationId}', {
          body,
          params: { path: { locationId } },
          headers: headers('access'),
        }),
      ),
    ownerListScannerDevices: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/devices', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerPairScannerDevice: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/devices/pair', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    async ownerRevokeScannerDevice(venueId, deviceId) {
      const result = await client.DELETE('/owner/venues/{venueId}/devices/{deviceId}', {
        params: { path: { venueId, deviceId } },
        headers: headers('access'),
      });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
  } satisfies Partial<ApiClient>;
}
