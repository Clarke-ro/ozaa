import createClient from 'openapi-fetch';
import type { paths } from './schema';
import type { ApiClient, TokenSource } from './client';
import { ApiError } from './errors';

function problem(error: unknown, status: number): ApiError {
  if (typeof error === 'object' && error !== null && 'title' in error && 'status' in error) {
    const body = error as { title?: unknown; status?: unknown; code?: unknown; detail?: unknown };
    const title = typeof body.title === 'string' ? body.title : 'Something went wrong';
    const code = typeof body.code === 'string' ? body.code : 'request_failed';
    const detail = typeof body.detail === 'string' ? body.detail : undefined;
    const httpStatus = typeof body.status === 'number' ? body.status : status;
    return new ApiError(httpStatus, code, title, detail);
  }
  return new ApiError(status, 'request_failed', 'Something went wrong');
}

export function createHttpClient(baseUrl: string, tokens: TokenSource): ApiClient {
  const client = createClient<paths>({ baseUrl });
  const headers = (
    kind: 'guest' | 'access' | 'loyalty',
    call?: { idempotencyKey?: string; ifNoneMatch?: string; deleteToken?: string },
  ) => {
    const token =
      kind === 'guest'
        ? tokens.guest()
        : kind === 'loyalty'
          ? (tokens.loyalty?.() ?? tokens.access())
          : tokens.access();
    const value: Record<string, string> = {};
    if (token) value.Authorization = `Bearer ${token}`;
    if (call?.idempotencyKey) value['Idempotency-Key'] = call.idempotencyKey;
    if (call?.ifNoneMatch) value['If-None-Match'] = call.ifNoneMatch;
    if (call?.deleteToken) value['X-Delete-Token'] = call.deleteToken;
    return value;
  };

  async function ok<T>(
    pending: Promise<{ data?: T; error?: unknown; response: Response }>,
  ): Promise<T> {
    const result = await pending;
    if (result.response.status === 304) throw new ApiError(304, 'not_modified', 'Not modified');
    if (result.data === undefined) throw problem(result.error, result.response.status);
    return result.data;
  }

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
          headers: headers('guest', call),
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
    async paystackWebhook() {
      throw new ApiError(404, 'request_failed', 'The app does not call the Paystack webhook');
    },
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
          headers: headers('loyalty'),
        }),
      ),
    async sendFeedback(body) {
      const result = await client.POST('/feedback', { body, headers: headers('guest') });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    ownerGetVenue: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerUpdateVenue: (venueId, body) =>
      ok(
        client.PATCH('/owner/venues/{venueId}', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerSetTheme: (venueId, body) =>
      ok(
        client.PUT('/owner/venues/{venueId}/theme', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerCreateMediaUpload: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/media', {
          body: body as never,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerGetServices: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/services', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerSetServices: (venueId, body) =>
      ok(
        client.PUT('/owner/venues/{venueId}/services', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerListStaff: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/staff', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerInviteStaff: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/staff', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerListCategories: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/menu/categories', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerCreateCategory: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/menu/categories', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerUpdateCategory: (venueId, categoryId, body) =>
      ok(
        client.PATCH('/owner/venues/{venueId}/menu/categories/{categoryId}', {
          body,
          params: { path: { venueId, categoryId } },
          headers: headers('access'),
        }),
      ),
    async ownerDeleteCategory(venueId, categoryId) {
      const result = await client.DELETE('/owner/venues/{venueId}/menu/categories/{categoryId}', {
        params: { path: { venueId, categoryId } },
        headers: headers('access'),
      });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    ownerCreateItem: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/menu/items', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerUpdateItem: (venueId, itemId, body) =>
      ok(
        client.PATCH('/owner/venues/{venueId}/menu/items/{menuItemId}', {
          body,
          params: { path: { venueId, menuItemId: itemId } },
          headers: headers('access'),
        }),
      ),
    async ownerDeleteItem(venueId, itemId) {
      const result = await client.DELETE('/owner/venues/{venueId}/menu/items/{menuItemId}', {
        params: { path: { venueId, menuItemId: itemId } },
        headers: headers('access'),
      });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    ownerListTables: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/tables', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerCreateTables: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/tables', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    async ownerGetTableQr(venueId, tableId, format) {
      const result = await client.GET('/owner/venues/{venueId}/tables/{tableId}/qr', {
        params: { path: { venueId, tableId }, query: format ? { format } : {} },
        headers: headers('access'),
        parseAs: 'text',
      });
      if (!result.response.ok || result.data === undefined)
        throw problem(result.error, result.response.status);
      return result.data;
    },
    ownerListOrders: (venueId, filter) =>
      ok(
        client.GET('/owner/venues/{venueId}/orders', {
          params: { path: { venueId }, query: { since: filter?.since, until: filter?.until } },
          headers: headers('access'),
        }),
      ),
    ownerCreateOrder: (venueId, body, call) =>
      ok(
        client.POST('/owner/venues/{venueId}/orders', {
          body,
          params: {
            path: { venueId },
            header: { 'Idempotency-Key': call.idempotencyKey ?? '' },
          },
          headers: headers('access', call),
        }),
      ),
    ownerSetOrderStatus: (orderId, body) =>
      ok(
        client.PUT('/owner/orders/{orderId}/status', {
          body,
          params: { path: { orderId } },
          headers: headers('access'),
        }),
      ),
    ownerRecordCashPayment: (orderId, body, call) =>
      ok(
        client.POST('/owner/orders/{orderId}/cash-payment', {
          body,
          params: { path: { orderId }, header: { 'Idempotency-Key': call?.idempotencyKey ?? '' } },
          headers: headers('access', call),
        }),
      ),
    ownerListWaiterCalls: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/waiter-calls', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerUpdateWaiterCall: (id, body) =>
      ok(
        client.PATCH('/owner/waiter-calls/{waiterCallId}', {
          body,
          params: { path: { waiterCallId: id } },
          headers: headers('access'),
        }),
      ),
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
    ownerGetPayoutAccount: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/payout-account', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerSetPayoutAccount: (venueId, body) =>
      ok(
        client.PUT('/owner/venues/{venueId}/payout-account', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerGetDashboard: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/dashboard', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerGetFloor: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/floor', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerListTransactions: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/transactions', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerRefundTransaction: (transactionId, call) =>
      ok(
        client.POST('/owner/transactions/{transactionId}/refund', {
          params: {
            path: { transactionId },
            header: { 'Idempotency-Key': call?.idempotencyKey ?? '' },
          },
          headers: headers('access', call),
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
    ownerGetInsights: (venueId, range) =>
      ok(
        client.GET('/owner/venues/{venueId}/insights', {
          params: { path: { venueId }, query: range ? { range } : {} },
          headers: headers('access'),
        }),
      ),
    async ownerRevokeStaff(venueId, staffId) {
      const result = await client.DELETE('/owner/venues/{venueId}/staff/{staffId}', {
        params: { path: { venueId, staffId } },
        headers: headers('access'),
      });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
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
    async deleteAccount(body) {
      const result = await client.DELETE('/auth/account', { body, headers: headers('access') });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
  };
}
