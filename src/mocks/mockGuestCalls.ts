import { quoteBill } from '../features/pay/quoteBill';
import { passedFee } from '@/lib/paystackFee';
import { pesewas } from '@/lib/brand';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { Payment } from '@/lib/api/types';
import { findOrder, nextId, publicVenue, venueById, venueBySlug } from './world';
import { etag, fresh, linkExtras, mockCheckoutUrl, sessionOf } from './mockRules';
import type { MockContext } from './mockContext';

/** Mock calls: what a guest does at the table: menu, order, bill, pay, call a waiter. */
export function mockGuestCalls(ctx: MockContext) {
  const { world, tokens, now, fast, gate, placeOrder, remember, settle } = ctx;
  return {
    async getVenue(slug, call) {
      await gate();
      const found = venueBySlug(world, slug);
      const venue = publicVenue(
        found,
        world.notices[found.slug],
        now(),
        world.paymentSettings[found.id],
      );
      const tag = etag(venue);
      if (call?.ifNoneMatch === tag) throw new ApiError(304, 'not_modified', 'Not modified');
      return venue;
    },
    async getMenu(slug, call) {
      await gate();
      const venue = venueBySlug(world, slug);
      const menu = world.menus[slug];
      if (!menu) throw new ApiError(404, 'order_not_found', 'Menu not found');
      // Count this visit as "opened the menu" for the Insights funnel, once per visit.
      const token = tokens.guest();
      const visit = token ? world.sessions.get(token) : undefined;
      if (visit && visit.slug === slug && !visit.menuOpenedAt)
        visit.menuOpenedAt = new Date(now()).toISOString();
      if (call?.ifNoneMatch === etag(menu)) throw new ApiError(304, 'not_modified', 'Not modified');
      return { ...menu, venueId: venue.id };
    },
    async getWifi(slug) {
      await gate();
      venueBySlug(world, slug);
      const wifi = world.wifi[slug];
      if (!wifi) throw new ApiError(404, 'venue_not_found', 'No Wi-Fi saved');
      return wifi;
    },
    async listOffers(slug) {
      await gate();
      venueBySlug(world, slug);
      return { items: world.offers[slug] ?? [] };
    },
    async createOrder(body, call) {
      await gate();
      return remember(call.idempotencyKey, () => {
        const session = sessionOf(world, tokens);
        const venue = venueBySlug(world, session.slug);
        const menu = world.menus[session.slug];
        if (!menu) throw new ApiError(404, 'order_not_found', 'Menu not found');
        if (venue.published === false) {
          throw new ApiError(422, 'venue_not_published', 'This menu is not open yet');
        }
        const order = placeOrder(venue, menu, body, session.tableCode, false, (food) =>
          session.tableCode ? { source: 'table' } : linkExtras(venue, body.fulfilment, food),
        );
        session.orderId = order.id;
        session.orderedAt ??= order.createdAt;
        return order;
      });
    },
    async getOrder(orderId, call) {
      await gate();
      const live = findOrder(world, orderId);
      const order = fresh(world, live, now(), fast);
      if (call?.ifNoneMatch === etag(order))
        throw new ApiError(304, 'not_modified', 'Not modified');
      return order;
    },
    async quoteBill(orderId, body) {
      await gate();
      const live = findOrder(world, orderId);
      const quote = quoteBill(
        {
          lines: live.order.lines.map((line) => ({
            id: line.id,
            totalPesewas: pesewas(line.totalPesewas),
            paid: line.paid,
          })),
          totalPesewas: pesewas(live.order.totalPesewas),
          paidPesewas: pesewas(live.order.paidPesewas),
        },
        {
          mode: body.mode,
          parts: body.parts,
          lineIds: body.lineIds,
          tip: body.tip
            ? {
                percent: body.tip.percent,
                customPesewas:
                  body.tip.customPesewas !== undefined
                    ? pesewas(body.tip.customPesewas)
                    : undefined,
              }
            : undefined,
        },
      );
      // The owner may pass some or all of Paystack's fee to the guest. It sits on top of the bill.
      const passing = world.paymentSettings[live.order.venueId]?.feePassing;
      const fee = passing?.enabled
        ? passedFee(quote.sharePesewas + quote.tipPesewas, passing.percent)
        : 0;
      const quoteId = nextId(world, 'quo');
      world.quotes.set(quoteId, {
        orderId,
        share: quote.sharePesewas,
        tip: quote.tipPesewas,
        fee,
        lineIds: body.lineIds ?? [],
        expiresAt: now() + 10 * 60_000,
      });
      return {
        quoteId,
        orderId,
        ...quote,
        feePesewas: pesewas(fee),
        totalPesewas: pesewas(quote.totalPesewas + fee),
        expiresAt: new Date(now() + 10 * 60_000).toISOString(),
      };
    },
    async initializePayment(body, call) {
      await gate();
      return remember(call.idempotencyKey, () => {
        const quote = world.quotes.get(body.quoteId);
        if (!quote || quote.expiresAt < now())
          throw new ApiError(409, 'quote_expired', 'That bill changed. Ask for a new total.');
        // Online payment goes through the venue's own Paystack, so no keys means no online pay.
        const venueId = findOrder(world, quote.orderId).order.venueId;
        const paystack = world.paymentSettings[venueId]?.paystack ?? null;
        if (!paystack)
          throw new ApiError(409, 'online_pay_off', 'This venue takes payment in person.');
        const reference = nextId(world, 'pay');
        const createdAt = new Date(now()).toISOString();
        const payment: Payment = {
          id: reference,
          reference,
          orderId: quote.orderId,
          method: body.method,
          provider: body.momo?.provider,
          amountPesewas: quote.share + quote.tip + quote.fee,
          tipPesewas: quote.tip,
          feePesewas: quote.fee,
          currency: 'GHS',
          status: body.method === 'momo' ? 'pay_offline' : 'open_url',
          displayText:
            body.method === 'momo' ? 'Check your phone and enter your PIN to approve.' : undefined,
          authorizationUrl:
            body.method === 'card'
              ? mockCheckoutUrl(reference, venueById(world, venueId)?.slug ?? '')
              : undefined,
          approveBy: body.method === 'momo' ? new Date(now() + 180_000).toISOString() : null,
          createdAt,
          paidAt: null,
          testMode: paystack.mode === 'test',
        };
        world.payments.set(reference, {
          payment,
          phone: body.momo?.phone ?? '',
          applied: false,
          quoteId: body.quoteId,
        });
        return payment;
      });
    },
    async getPayment(reference) {
      await gate();
      return settle(reference);
    },
    async verifyPayment(reference) {
      await gate();
      return settle(reference);
    },
    async callWaiter(body, call) {
      await gate();
      return remember(call.idempotencyKey, () => {
        const session = sessionOf(world, tokens);
        if (!session.tableCode)
          throw new ApiError(400, 'bad_request', 'Scan the code on your table first');
        const open = world.calls.find(
          (item) => item.tableCode === session.tableCode && item.status !== 'resolved',
        );
        if (open) {
          open.reason = body.reason;
          open.note = body.note;
          return open;
        }
        const callRow = {
          id: nextId(world, 'wcl'),
          venueId: venueBySlug(world, session.slug).id,
          tableCode: session.tableCode,
          reason: body.reason,
          note: body.note,
          status: 'open' as const,
          staffFirstName: null,
          createdAt: new Date(now()).toISOString(),
          acknowledgedAt: null,
        };
        world.calls.push(callRow);
        return callRow;
      });
    },
    async getWaiterCall(id) {
      await gate();
      const callRow = world.calls.find((item) => item.id === id);
      if (!callRow) throw new ApiError(404, 'order_not_found', 'That call has finished');
      if (callRow.status === 'open' && now() - Date.parse(callRow.createdAt) >= 8_000) {
        callRow.status = 'acknowledged';
        callRow.staffFirstName = 'Kwesi';
        callRow.acknowledgedAt = new Date(now()).toISOString();
      }
      return callRow;
    },
  } satisfies Partial<ApiClient>;
}
