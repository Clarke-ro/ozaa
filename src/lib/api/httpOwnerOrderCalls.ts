import type { ApiClient } from './client';
import type { HttpContext } from './httpContext';

/** Real-server calls: staff run service: orders, marking paid, payment settings, waiter calls, the floor. */
export function httpOwnerOrderCalls({ client, headers, ok }: HttpContext) {
  return {
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
    ownerRecordManualPayment: (orderId, body, call) =>
      ok(
        client.POST('/owner/orders/{orderId}/manual-payment', {
          body,
          params: {
            path: { orderId },
            header: { 'Idempotency-Key': call?.idempotencyKey ?? '' },
          },
          headers: headers('access', call),
        }),
      ),
    ownerGetPaymentSettings: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/payment-settings', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerSetManualPayments: (venueId, body) =>
      ok(
        client.PUT('/owner/venues/{venueId}/payment-settings/manual', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerSetFeePassing: (venueId, body) =>
      ok(
        client.PUT('/owner/venues/{venueId}/payment-settings/fees', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerConnectPaystack: (venueId, body) =>
      ok(
        client.PUT('/owner/venues/{venueId}/payment-settings/paystack', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerDisconnectPaystack: (venueId) =>
      ok(
        client.DELETE('/owner/venues/{venueId}/payment-settings/paystack', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerTestPaystack: (venueId) =>
      ok(
        client.POST('/owner/venues/{venueId}/payment-settings/paystack/test', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerListWaiterCalls: (venueId, query) =>
      ok(
        client.GET('/owner/venues/{venueId}/waiter-calls', {
          params: { path: { venueId }, query: query ?? {} },
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
  } satisfies Partial<ApiClient>;
}
