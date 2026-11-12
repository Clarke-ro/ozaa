import { orderTransition } from '../features/orders/orderMachine';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { dashboardFor, floorFor, refundFor, transactionsFor } from './ownerDesk';
import { checkManualPayments, checkPaystackKeys, keyHint } from '@/lib/payments';
import { LIVE_PAYMENTS_ENABLED } from '@/lib/features';
import { defaultPaymentSettings, findOrder, STAFF, venueById } from './world';
import { accessOf, fresh, linkExtras, ownerOnly, staffRole } from './mockRules';
import type { MockContext } from './mockContext';

/** Mock calls: staff run service: orders, marking paid, payment settings, waiter calls, the floor. */
export function mockOwnerOrderCalls(ctx: MockContext) {
  const { world, tokens, now, fast, gate, placeOrder, remember } = ctx;
  return {
    async ownerListOrders(venueId, filter) {
      await gate();
      const since = filter?.since ? Date.parse(filter.since) : -Infinity;
      const until = filter?.until ? Date.parse(filter.until) : Infinity;
      const items = world.orders
        .filter((item) => item.order.venueId === venueId)
        .filter((item) => {
          const at = Date.parse(item.order.createdAt);
          return at >= since && at < until;
        })
        .map((item) => fresh(world, item, now(), fast));
      return { items, nextCursor: null as string | null };
    },
    async ownerCreateOrder(venueId, body, call) {
      await gate();
      const row = accessOf(world, tokens);
      const staff = STAFF.find((person) => person.phone === row.phone);
      // Kitchen staff and viewers can't take orders; owners, managers and waiters can.
      if (!staff || !['owner', 'manager', 'waiter'].includes(staff.role)) {
        throw new ApiError(403, 'forbidden', 'Your role cannot add orders');
      }
      return remember(call.idempotencyKey, () => {
        const venue = venueById(world, venueId);
        const menu = world.menus[venue.slug];
        if (!menu) throw new ApiError(404, 'order_not_found', 'Menu not found');
        // Works while unpublished, so staff can try the menu before opening.
        const tableCode = body.tableCode ?? null;
        return placeOrder(venue, menu, body, tableCode, true, (food) =>
          body.fulfilment
            ? linkExtras(venue, body.fulfilment, food, true)
            : { source: tableCode ? 'table' : 'pickup' },
        );
      });
    },
    async ownerSetOrderStatus(orderId, body) {
      await gate();
      const row = accessOf(world, tokens);
      const staff = STAFF.find((person) => person.phone === row.phone);
      const live = findOrder(world, orderId);
      const move =
        body.status === 'preparing'
          ? 'start'
          : body.status === 'ready'
            ? 'ready'
            : body.status === 'served'
              ? 'serve'
              : body.status === 'cancelled'
                ? 'cancel'
                : null;
      const next = move && staff ? orderTransition(live.order.status, move, staff.role) : null;
      if (!next || next !== body.status)
        throw new ApiError(409, 'illegal_move', 'That status change is not allowed');
      live.manual = true;
      live.order = {
        ...live.order,
        status: next,
        updatedAt: new Date(now()).toISOString(),
        readyAt: next === 'ready' ? new Date(now()).toISOString() : live.order.readyAt,
      };
      return live.order;
    },
    async ownerRecordManualPayment(orderId, body, call) {
      await gate();
      const role = staffRole(world, tokens);
      if (role !== 'owner' && role !== 'manager' && role !== 'waiter') {
        throw new ApiError(403, 'forbidden', 'Your role cannot mark orders paid');
      }
      return remember(call?.idempotencyKey, () => {
        const live = findOrder(world, orderId);
        // Already paid: nothing changes, so a double tap is harmless.
        if (live.order.paymentStatus === 'paid') return live.order;
        live.order = {
          ...live.order,
          paidPesewas: live.order.totalPesewas,
          paymentStatus: 'paid',
          paymentMethod: body.method,
          updatedAt: new Date(now()).toISOString(),
        };
        return live.order;
      });
    },
    async ownerGetPaymentSettings(venueId) {
      await gate();
      ownerOnly(world, tokens);
      venueById(world, venueId);
      return world.paymentSettings[venueId] ?? defaultPaymentSettings();
    },
    async ownerSetManualPayments(venueId, body) {
      await gate();
      ownerOnly(world, tokens);
      const check = checkManualPayments(body);
      if (!check.ok)
        throw new ApiError(400, `manual_${check.field}_incomplete`, 'Add the details first');
      const current = world.paymentSettings[venueId] ?? defaultPaymentSettings();
      world.paymentSettings[venueId] = { ...current, manual: body };
      return world.paymentSettings[venueId];
    },
    async ownerConnectPaystack(venueId, body) {
      await gate();
      ownerOnly(world, tokens);
      const check = checkPaystackKeys(body, LIVE_PAYMENTS_ENABLED);
      if (!check.ok) throw new ApiError(422, check.code, 'Paystack did not accept these keys');
      const current = world.paymentSettings[venueId] ?? defaultPaymentSettings();
      // The real server checks the keys with Paystack and stores the secret encrypted.
      // The mock keeps only what the app may see: never the secret key.
      world.paymentSettings[venueId] = {
        ...current,
        paystack: {
          mode: body.mode,
          publicKey: body.publicKey.trim(),
          secretKeyHint: keyHint(body.secretKey),
          connectedAt: new Date(now()).toISOString(),
          lastCheckedAt: new Date(now()).toISOString(),
        },
      };
      return world.paymentSettings[venueId];
    },
    async ownerDisconnectPaystack(venueId) {
      await gate();
      ownerOnly(world, tokens);
      const current = world.paymentSettings[venueId] ?? defaultPaymentSettings();
      world.paymentSettings[venueId] = { ...current, paystack: null };
      return world.paymentSettings[venueId];
    },
    async ownerTestPaystack(venueId) {
      await gate();
      ownerOnly(world, tokens);
      const current = world.paymentSettings[venueId] ?? defaultPaymentSettings();
      const checkedAt = new Date(now()).toISOString();
      if (!current.paystack)
        return { ok: false, checkedAt, message: 'Connect your Paystack account first.' };
      world.paymentSettings[venueId] = {
        ...current,
        paystack: { ...current.paystack, lastCheckedAt: checkedAt },
      };
      return { ok: true, checkedAt };
    },
    async ownerListWaiterCalls(venueId) {
      await gate();
      return {
        items: world.calls
          .filter((call) => call.venueId === venueId)
          .map(({ venueId: _id, ...call }) => call),
      };
    },
    async ownerUpdateWaiterCall(id, body) {
      await gate();
      const callRow = world.calls.find((item) => item.id === id);
      if (!callRow) throw new ApiError(404, 'order_not_found', 'That call has finished');
      const staff = STAFF.find((person) => person.phone === accessOf(world, tokens).phone);
      callRow.status = body.status;
      if (body.status === 'acknowledged') {
        callRow.staffFirstName = staff?.firstName ?? 'Kwesi';
        callRow.acknowledgedAt = new Date(now()).toISOString();
      }
      return callRow;
    },
    async ownerGetDashboard(venueId) {
      await gate();
      accessOf(world, tokens);
      return dashboardFor(world, venueId, now());
    },
    async ownerGetFloor(venueId) {
      await gate();
      accessOf(world, tokens);
      return floorFor(world, venueId);
    },
    async ownerListTransactions(venueId) {
      await gate();
      accessOf(world, tokens);
      return transactionsFor(world, venueId);
    },
    async ownerRefundTransaction(transactionId, call) {
      await gate();
      accessOf(world, tokens);
      return remember(call?.idempotencyKey, () => refundFor(world, transactionId));
    },
  } satisfies Partial<ApiClient>;
}
