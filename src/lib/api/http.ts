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
  const headers = (kind: 'guest' | 'access', call?: { idempotencyKey?: string; ifNoneMatch?: string; deleteToken?: string }) => {
    const token = kind === 'guest' ? tokens.guest() : tokens.access();
    const value: Record<string, string> = {};
    if (token) value.Authorization = `Bearer ${token}`;
    if (call?.idempotencyKey) value['Idempotency-Key'] = call.idempotencyKey;
    if (call?.ifNoneMatch) value['If-None-Match'] = call.ifNoneMatch;
    if (call?.deleteToken) value['X-Delete-Token'] = call.deleteToken;
    return value;
  };

  async function ok<T>(pending: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
    const result = await pending;
    if (result.response.status === 304) throw new ApiError(304, 'not_modified', 'Not modified');
    if (result.data === undefined) throw problem(result.error, result.response.status);
    return result.data;
  }

  return {
    requestOtp: (body, call) => ok(client.POST('/auth/otp/request', { body, params: { header: { 'Idempotency-Key': call?.idempotencyKey ?? '' } } })),
    verifyOtp: (body) => ok(client.POST('/auth/otp/verify', { body })),
    refreshTokens: (body) => ok(client.POST('/auth/refresh', { body })),
    async logout() {
      const result = await client.POST('/auth/logout', { headers: headers('access') });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    getMe: () => ok(client.GET('/me', { headers: headers('access') })),
    createGuestSession: (body) => ok(client.POST('/guest-sessions', { body })),
    getVenue: (slug, call) => ok(client.GET('/venues/{venueSlug}', { params: { path: { venueSlug: slug } }, headers: headers('guest', call) })),
    getMenu: (slug, call) => ok(client.GET('/venues/{venueSlug}/menu', { params: { path: { venueSlug: slug } }, headers: headers('guest', call) })),
    getWifi: (slug) => ok(client.GET('/venues/{venueSlug}/wifi', { params: { path: { venueSlug: slug } } })),
    listStories: (slug) => ok(client.GET('/venues/{venueSlug}/stories', { params: { path: { venueSlug: slug } } })),
    listOffers: (slug) => ok(client.GET('/venues/{venueSlug}/offers', { params: { path: { venueSlug: slug } } })),
    createOrder: (body, call) => ok(client.POST('/orders', { body, params: { header: { 'Idempotency-Key': call.idempotencyKey ?? '' } }, headers: headers('guest', call) })),
    getOrder: (orderId, call) => ok(client.GET('/orders/{orderId}', { params: { path: { orderId } }, headers: headers('guest', call) })),
    quoteBill: (orderId, body) => ok(client.POST('/orders/{orderId}/bill', { body, params: { path: { orderId } }, headers: headers('guest') })),
    initializePayment: (body, call) => ok(client.POST('/payments', { body, params: { header: { 'Idempotency-Key': call.idempotencyKey ?? '' } }, headers: headers('guest', call) })),
    getPayment: (reference) => ok(client.GET('/payments/{reference}', { params: { path: { reference } }, headers: headers('guest') })),
    verifyPayment: (reference) => ok(client.POST('/payments/{reference}/verify', { params: { path: { reference } }, headers: headers('guest') })),
    async paystackWebhook() {
      throw new ApiError(404, 'request_failed', 'The app does not call the Paystack webhook');
    },
    callWaiter: (body, call) => ok(client.POST('/waiter-calls', { body, params: { header: { 'Idempotency-Key': call.idempotencyKey ?? '' } }, headers: headers('guest', call) })),
    getWaiterCall: (id) => ok(client.GET('/waiter-calls/{waiterCallId}', { params: { path: { waiterCallId: id } }, headers: headers('guest') })),
    getMyLoyaltyCard: (slug) => ok(client.GET('/venues/{venueSlug}/loyalty/me', { params: { path: { venueSlug: slug } }, headers: headers('access') })),
    joinLoyalty: (slug, body) => ok(client.PUT('/venues/{venueSlug}/loyalty/me', { body, params: { path: { venueSlug: slug } }, headers: headers('access') })),
    async leaveLoyalty(slug) {
      const result = await client.DELETE('/venues/{venueSlug}/loyalty/me', { params: { path: { venueSlug: slug } }, headers: headers('access') });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    redeemReward: (slug, body, call) => ok(client.POST('/venues/{venueSlug}/loyalty/me/redeem', { body, params: { path: { venueSlug: slug }, header: { 'Idempotency-Key': call.idempotencyKey ?? '' } }, headers: headers('access', call) })),
    createReview: (body, call) => ok(client.POST('/reviews', { body, params: { header: { 'Idempotency-Key': call.idempotencyKey ?? '' } }, headers: headers('guest', call) })),
    createVideoUpload: (body) => ok(client.POST('/video-reviews/uploads', { body: body as never, headers: headers('guest') })),
    createVideoReview: (body, call) => ok(client.POST('/video-reviews', { body, params: { header: { 'Idempotency-Key': call.idempotencyKey ?? '' } }, headers: headers('guest', call) })),
    async deleteMyVideoReview(id, call) {
      const result = await client.DELETE('/video-reviews/{videoReviewId}', { params: { path: { videoReviewId: id }, header: { 'X-Delete-Token': call.deleteToken ?? '' } }, headers: headers('guest', call) });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    getLeaderboard: (slug) => ok(client.GET('/venues/{venueSlug}/game/leaderboard', { params: { path: { venueSlug: slug } } })),
    submitScore: (slug, body) => ok(client.POST('/venues/{venueSlug}/game/scores', { body, params: { path: { venueSlug: slug } } })),
    async sendFeedback(body) {
      const result = await client.POST('/feedback', { body, headers: headers('guest') });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    ownerGetVenue: (venueId) => ok(client.GET('/owner/venues/{venueId}', { params: { path: { venueId } }, headers: headers('access') })),
    ownerUpdateVenue: (venueId, body) => ok(client.PATCH('/owner/venues/{venueId}', { body, params: { path: { venueId } }, headers: headers('access') })),
    ownerSetTheme: (venueId, body) => ok(client.PUT('/owner/venues/{venueId}/theme', { body, params: { path: { venueId } }, headers: headers('access') })),
    ownerCreateMediaUpload: (venueId, body) => ok(client.POST('/owner/venues/{venueId}/media', { body: body as never, params: { path: { venueId } }, headers: headers('access') })),
    ownerGetServices: (venueId) => ok(client.GET('/owner/venues/{venueId}/services', { params: { path: { venueId } }, headers: headers('access') })),
    ownerSetServices: (venueId, body) => ok(client.PUT('/owner/venues/{venueId}/services', { body, params: { path: { venueId } }, headers: headers('access') })),
    ownerListStaff: (venueId) => ok(client.GET('/owner/venues/{venueId}/staff', { params: { path: { venueId } }, headers: headers('access') })),
    ownerInviteStaff: (venueId, body) => ok(client.POST('/owner/venues/{venueId}/staff', { body, params: { path: { venueId } }, headers: headers('access') })),
    ownerListCategories: (venueId) => ok(client.GET('/owner/venues/{venueId}/menu/categories', { params: { path: { venueId } }, headers: headers('access') })),
    ownerCreateCategory: (venueId, body) => ok(client.POST('/owner/venues/{venueId}/menu/categories', { body, params: { path: { venueId } }, headers: headers('access') })),
    ownerUpdateCategory: (venueId, categoryId, body) => ok(client.PATCH('/owner/venues/{venueId}/menu/categories/{categoryId}', { body, params: { path: { venueId, categoryId } }, headers: headers('access') })),
    async ownerDeleteCategory(venueId, categoryId) {
      const result = await client.DELETE('/owner/venues/{venueId}/menu/categories/{categoryId}', { params: { path: { venueId, categoryId } }, headers: headers('access') });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    ownerCreateItem: (venueId, body) => ok(client.POST('/owner/venues/{venueId}/menu/items', { body, params: { path: { venueId } }, headers: headers('access') })),
    ownerUpdateItem: (venueId, itemId, body) => ok(client.PATCH('/owner/venues/{venueId}/menu/items/{menuItemId}', { body, params: { path: { venueId, menuItemId: itemId } }, headers: headers('access') })),
    async ownerDeleteItem(venueId, itemId) {
      const result = await client.DELETE('/owner/venues/{venueId}/menu/items/{menuItemId}', { params: { path: { venueId, menuItemId: itemId } }, headers: headers('access') });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    ownerListTables: (venueId) => ok(client.GET('/owner/venues/{venueId}/tables', { params: { path: { venueId } }, headers: headers('access') })),
    ownerCreateTables: (venueId, body) => ok(client.POST('/owner/venues/{venueId}/tables', { body, params: { path: { venueId } }, headers: headers('access') })),
    async ownerGetTableQr(venueId, tableId, format) {
      const result = await client.GET('/owner/venues/{venueId}/tables/{tableId}/qr', { params: { path: { venueId, tableId }, query: format ? { format } : {} }, headers: headers('access'), parseAs: 'text' });
      if (!result.response.ok || result.data === undefined) throw problem(result.error, result.response.status);
      return result.data;
    },
    ownerListOrders: (venueId) => ok(client.GET('/owner/venues/{venueId}/orders', { params: { path: { venueId } }, headers: headers('access') })),
    ownerSetOrderStatus: (orderId, body) => ok(client.PUT('/owner/orders/{orderId}/status', { body, params: { path: { orderId } }, headers: headers('access') })),
    ownerRecordCashPayment: (orderId, body, call) => ok(client.POST('/owner/orders/{orderId}/cash-payment', { body, params: { path: { orderId }, header: { 'Idempotency-Key': call?.idempotencyKey ?? '' } }, headers: headers('access', call) })),
    ownerListWaiterCalls: (venueId) => ok(client.GET('/owner/venues/{venueId}/waiter-calls', { params: { path: { venueId } }, headers: headers('access') })),
    ownerUpdateWaiterCall: (id, body) => ok(client.PATCH('/owner/waiter-calls/{waiterCallId}', { body, params: { path: { waiterCallId: id } }, headers: headers('access') })),
    ownerListVideoReviews: (venueId, state) => ok(client.GET('/owner/venues/{venueId}/video-reviews', { params: { path: { venueId }, query: state ? { state } : {} }, headers: headers('access') })),
    ownerModerateVideoReview: (id, body) => ok(client.PATCH('/owner/video-reviews/{videoReviewId}', { body, params: { path: { videoReviewId: id } }, headers: headers('access') })),
    ownerGetLoyalty: (venueId) => ok(client.GET('/owner/venues/{venueId}/loyalty', { params: { path: { venueId } }, headers: headers('access') })),
    ownerSetLoyalty: (venueId, body) => ok(client.PUT('/owner/venues/{venueId}/loyalty', { body, params: { path: { venueId } }, headers: headers('access') })),
    ownerListLoyaltyMembers: (venueId) => ok(client.GET('/owner/venues/{venueId}/loyalty/members', { params: { path: { venueId } }, headers: headers('access') })),
    ownerGetPayoutAccount: (venueId) => ok(client.GET('/owner/venues/{venueId}/payout-account', { params: { path: { venueId } }, headers: headers('access') })),
    ownerSetPayoutAccount: (venueId, body) => ok(client.PUT('/owner/venues/{venueId}/payout-account', { body, params: { path: { venueId } }, headers: headers('access') })),
  };
}
