import { moveFor, orderTransition } from '../features/orders/orderMachine';
import { applyCallUpdate, isInQueue } from '../features/waiter/callUpdate';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { dashboardFor, floorFor, refundFor, transactionsFor } from './ownerDesk';
import { checkManualPayments, checkPaystackKeys, keyHint } from '@/lib/payments';
import { LIVE_PAYMENTS_ENABLED } from '@/lib/features';
import { defaultPaymentSettings, findOrder, STAFF, venueById } from './world';
import { accessOf, fresh, linkExtras, ownerOnly, staffRole } from './mockRules';
import type { MockContext } from './mockContext';
import type { StaffRole } from '@/lib/api/types';

const handler = (staff: { phone: string; firstName: string; role: StaffRole }) => ({
  staffId: `stf_${staff.phone.slice(-4)}`,
  firstName: staff.firstName,
  role: staff.role,
});

/** Mock calls: staff run service: orders, marking paid, payment settings, waiter calls, the floor. */
export function mockOwnerOrderCalls(ctx: MockContext) {
  const { world, tokens, now, fast, gate, placeOrder, remember } = ctx;
  return {
    async ownerListOrders(venueId, filter) {
      await gate();
      const since = filter?.since ? Date.parse(filter.since) : -Infinity;
      const until = filter?.until ? Date.parse(filter.until) : Infinity;
      const updatedSince = filter?.updatedSince ? Date.parse(filter.updatedSince) : -Infinity;
      const live = new Set(['received', 'accepted', 'preparing', 'ready']);
      const items = world.orders
        .filter((item) => item.order.venueId === venueId)
        .map((item) => fresh(world, item, now(), fast))
        .filter((order) => {
          const at = Date.parse(order.createdAt);
          if (at < since || at >= until) return false;
          if (Date.parse(order.updatedAt) < updatedSince) return false;
          if (filter?.live && !live.has(order.status)) return false;
          return true;
        });
      return { items, nextCursor: null as string | null };
    },
    async ownerGetOrder(orderId) {
      await gate();
      accessOf(world, tokens);
      return fresh(world, findOrder(world, orderId), now(), fast);
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
        const order = placeOrder(venue, menu, body, tableCode, true, (food) =>
          body.fulfilment
            ? linkExtras(venue, body.fulfilment, food, true)
            : { source: tableCode ? 'table' : 'pickup' },
        );
        const live = world.orders.find((item) => item.order.id === order.id);
        if (live) live.handledBy = handler(staff);
        return order;
      });
    },
    async ownerSetOrderStatus(orderId, body) {
      await gate();
      const row = accessOf(world, tokens);
      const staff = STAFF.find((person) => person.phone === row.phone);
      const live = findOrder(world, orderId);
      const move = moveFor(body.status);
      const next = move && staff ? orderTransition(live.order.status, move, staff.role) : null;
      if (!next || next !== body.status)
        throw new ApiError(409, 'illegal_move', 'That status change is not allowed');
      const at = new Date(now()).toISOString();
      live.manual = true;
      // The person who serves a guest's own QR order is the one Sales credits.
      if (!live.handledBy && next === 'served' && staff) live.handledBy = handler(staff);
      live.order = {
        ...live.order,
        status: next,
        updatedAt: at,
        readyAt: next === 'ready' ? at : live.order.readyAt,
        servedAt: next === 'served' ? at : (live.order.servedAt ?? null),
        cancelReason:
          next === 'cancelled'
            ? body.cancelReason?.trim() || null
            : (live.order.cancelReason ?? null),
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
    async ownerSetFeePassing(venueId, body) {
      await gate();
      ownerOnly(world, tokens);
      venueById(world, venueId);
      if (!Number.isInteger(body.percent) || body.percent < 1 || body.percent > 100)
        throw new ApiError(400, 'fee_percent_invalid', 'Pick a share from 1% to 100%');
      const current = world.paymentSettings[venueId] ?? defaultPaymentSettings();
      world.paymentSettings[venueId] = { ...current, feePassing: body };
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
    async ownerListWaiterCalls(venueId, query) {
      await gate();
      accessOf(world, tokens);
      const open = query?.open ?? true;
      const since = query?.since ? Date.parse(query.since) : -Infinity;
      const items = world.calls
        .filter((call) => call.venueId === venueId)
        .filter((call) => (open ? isInQueue(call, now()) : Date.parse(call.createdAt) >= since))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(({ venueId: _id, ...call }) => call);
      return { items };
    },
    async ownerUpdateWaiterCall(id, body) {
      await gate();
      const index = world.calls.findIndex((item) => item.id === id);
      const callRow = world.calls[index];
      if (!callRow) throw new ApiError(404, 'not_found', 'That call has finished');
      const staff = STAFF.find((person) => person.phone === accessOf(world, tokens).phone);
      if (!staff) throw new ApiError(403, 'forbidden', 'Sign in as staff');
      const next = applyCallUpdate(callRow, body, staff.firstName, now());
      if (!next) throw new ApiError(409, 'illegal_move', 'That call has already finished');
      world.calls[index] = { ...next, venueId: callRow.venueId };
      const { venueId: _id, ...saved } = world.calls[index];
      return saved;
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
