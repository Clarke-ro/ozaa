import {
  blankVenue,
  currencyCode,
  LOYALTY_PROBLEMS,
  minor,
  samplePhone,
  toWire,
} from '../features/loyalty/facts';
import { mockUploadedImage } from './mediaRegistry';
import { orderTransition } from '../features/orders/orderMachine';
import { quoteBill } from '../features/pay/quoteBill';
import { deriveTheme } from '../features/theming/deriveTheme';
import { ghanaPhone, isGhanaPhone, pesewas } from '@/lib/brand';
import type { ApiClient, TokenSource } from '@/lib/api/client';
import { ApiError, OfflineError } from '@/lib/api/errors';
import type { LoyaltyCard, LoyaltyProgram, Order, Payment, VenueTheme } from '@/lib/api/types';
import { qrSvg } from '@/lib/qrSvg';
import {
  dashboardFor,
  floorFor,
  insightsFor,
  refundFor,
  replyFor,
  transactionsFor,
  writtenFor,
} from './ownerDesk';
import { decideMockCard, readMockCard } from './cardBox';
import { checkLine, takeStock, unitPrice } from '@/lib/dishRules';
import { rememberOpenOrder } from './openOrder';
import {
  createWorld,
  findOrder,
  keepLoyalty,
  nextId,
  publicVenue,
  serviceSettings,
  STAFF,
  venueById,
  venueBySlug,
  type LiveOrder,
  type World,
} from './world';

export type MockOptions = {
  latencyMs?: number;
  failRate?: number;
  now?: () => number;
  fast?: boolean;
  random?: () => number;
  tokens?: TokenSource;
};

function etag(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 33) ^ text.charCodeAt(index);
  return `"${(hash >>> 0).toString(16)}"`;
}

function fresh(world: World, live: LiveOrder, now: number, fast: boolean): Order {
  if (!live.manual && live.order.status !== 'cancelled') {
    const scale = fast ? 10 : 1;
    const elapsed = (now - live.receivedAt) * scale;
    let status: Order['status'] = 'received';
    if (elapsed >= 90_000) status = 'served';
    else if (elapsed >= 60_000) status = 'ready';
    else if (elapsed >= 20_000) status = 'preparing';
    if (status !== live.order.status) {
      live.order = {
        ...live.order,
        status,
        readyAt:
          status === 'ready' || status === 'served'
            ? new Date(now).toISOString()
            : live.order.readyAt,
        updatedAt: new Date(now).toISOString(),
      };
    }
  }
  return live.order;
}

function sessionOf(world: World, tokens: TokenSource) {
  const token = tokens.guest();
  if (!token) throw new ApiError(401, 'unauthorized', 'Sign in again');
  const session = world.sessions.get(token);
  if (!session) throw new ApiError(401, 'unauthorized', 'Sign in again');
  return session;
}

function accessOf(world: World, tokens: TokenSource) {
  const token = tokens.access();
  if (!token) throw new ApiError(401, 'unauthorized', 'Sign in again');
  const row = world.access.get(token);
  if (!row) throw new ApiError(401, 'unauthorized', 'Sign in again');
  return row;
}

function loyaltyOf(world: World, tokens: TokenSource) {
  const token = tokens.loyalty?.() ?? tokens.access();
  if (!token) throw new ApiError(401, 'unauthorized', 'Sign in again');
  const row = world.access.get(token);
  if (!row) throw new ApiError(401, 'unauthorized', 'Sign in again');
  return row;
}

function themeOf(accent: string | null, fontPair: VenueTheme['fontPair']): VenueTheme {
  const derived = deriveTheme(accent);
  return {
    accent,
    fontPair,
    derived: {
      fill: derived.fill,
      onAccent: derived.onAccent,
      pressed: derived.pressed,
      ink: derived.ink,
      tint: derived.tint,
      badgeInk: derived.badgeInk,
      notes: derived.notes,
      ozaaDistance: derived.ozaaDistance,
      ratios: {
        buttonText: derived.ratios.buttonText,
        inkOnWhite: derived.ratios.inkOnWhite,
        badge: derived.ratios.badge,
      },
    },
  };
}

export function createMockClient(options: MockOptions = {}): ApiClient {
  const now = options.now ?? (() => Date.now());
  const world = createWorld(now());
  const tokens = options.tokens ?? { guest: () => null, access: () => null };
  const latencyMs = options.latencyMs ?? 0;
  const failRate = options.failRate ?? 0;
  const random = options.random ?? Math.random;
  const fast = options.fast ?? false;

  async function gate(): Promise<void> {
    if (random() < failRate) throw new OfflineError();
    if (latencyMs > 0) {
      const wait = latencyMs * (0.5 + random());
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }

  function remember<T>(key: string | undefined, make: () => T): T {
    if (key) {
      const saved = world.idempotency.get(key);
      if (saved) return saved as T;
    }
    const value = make();
    if (key) world.idempotency.set(key, value);
    return value;
  }

  function settle(reference: string): Payment {
    const row = world.payments.get(reference);
    if (!row) throw new ApiError(404, 'payment_not_found', 'Payment not found');
    const clock = now();
    const choice = readMockCard(reference);
    if (choice && (row.payment.status === 'open_url' || row.payment.status === 'pending')) {
      row.payment = { ...row.payment, status: choice === 'succeeded' ? 'succeeded' : 'abandoned' };
    }
    if (row.payment.status === 'pay_offline' || row.payment.status === 'pending') {
      const digit = row.phone.slice(-1);
      const elapsed = clock - Date.parse(row.payment.createdAt);
      const approveBy = row.payment.approveBy ? Date.parse(row.payment.approveBy) : clock;
      if (digit === '9' && clock >= approveBy)
        row.payment = { ...row.payment, status: 'abandoned' };
      else if (digit === '0' && elapsed >= 5_000) {
        row.payment = {
          ...row.payment,
          status: 'failed',
          failureReason: 'Not enough money in the wallet.',
        };
      } else if (
        digit !== '9' &&
        digit !== '0' &&
        elapsed >= 5_000 &&
        row.payment.method === 'momo'
      ) {
        row.payment = {
          ...row.payment,
          status: 'succeeded',
          paidAt: new Date(clock).toISOString(),
        };
      }
    }
    if (row.payment.status === 'succeeded' && !row.applied) {
      row.applied = true;
      const quote = [...world.quotes.values()].find((item) => world.payments.get(reference));
      const live = findOrder(world, row.payment.orderId);
      const share = row.payment.amountPesewas - (row.payment.tipPesewas ?? 0);
      const paid = live.order.paidPesewas + share;
      const lineIds = quote && quote.orderId === live.order.id ? quote.lineIds : [];
      const lines = live.order.lines.map((line) =>
        lineIds.includes(line.id) ? { ...line, paid: true } : line,
      );
      live.order = {
        ...live.order,
        lines,
        paidPesewas: paid,
        paymentStatus: paid >= live.order.totalPesewas ? 'paid' : 'part_paid',
        updatedAt: new Date(clock).toISOString(),
      };
      const loyaltyToken = tokens.loyalty?.() ?? tokens.access();
      const loyalty = loyaltyToken ? world.access.get(loyaltyToken) : undefined;
      const loyaltyPhone =
        loyalty?.purpose === 'guest_loyalty' && isGhanaPhone(loyalty.phone)
          ? ghanaPhone(loyalty.phone)
          : null;
      const momoPhone = isGhanaPhone(row.phone) ? ghanaPhone(row.phone) : null;
      const venue = venueById(world, live.order.venueId);
      keepLoyalty(
        world,
        venue.id,
        {
          type: 'paid_visit',
          orderId: live.order.id,
          amountMinor: minor(live.order.totalPesewas),
          currency: currencyCode(venue.currency),
          paid: live.order.paymentStatus === 'paid',
          loyaltyPhone,
          momoPhone,
        },
        new Date(clock).toISOString(),
      );
    }
    return row.payment;
  }

  const api: ApiClient = {
    async requestOtp(body) {
      await gate();
      return { expiresInSeconds: 300, resendInSeconds: 30 };
    },
    async verifyOtp(body) {
      await gate();
      const fails = world.otpFails.get(body.phone) ?? 0;
      if (fails >= 3) throw new ApiError(429, 'rate_limited', 'Too many tries');
      if (body.code !== '123456') {
        world.otpFails.set(body.phone, fails + 1);
        throw new ApiError(401, 'bad_code', 'That code is wrong');
      }
      world.otpFails.set(body.phone, 0);
      const accessToken = `acc_${body.purpose}_${body.phone}`;
      const refreshToken = `rfr_${body.phone}_${world.seq}`;
      world.access.set(accessToken, { phone: body.phone, purpose: body.purpose });
      world.refresh.set(refreshToken, accessToken);
      const staff = STAFF.find((person) => person.phone === body.phone);
      const venue = staff ? world.venues[staff.slug] : undefined;
      return {
        accessToken,
        refreshToken,
        expiresAt: new Date(now() + 3600_000).toISOString(),
        user:
          body.purpose === 'owner_login' && staff && venue
            ? {
                id: `usr_${body.phone.slice(-4)}`,
                firstName: staff.firstName,
                phone: body.phone,
                venues: [{ venueId: venue.id, name: venue.name, role: staff.role }],
              }
            : undefined,
      };
    },
    async refreshTokens(body) {
      await gate();
      const previous = world.refresh.get(body.refreshToken);
      if (!previous) throw new ApiError(401, 'unauthorized', 'Sign in again');
      const row = world.access.get(previous);
      if (!row) throw new ApiError(401, 'unauthorized', 'Sign in again');
      world.refresh.delete(body.refreshToken);
      return api.verifyOtp({ phone: row.phone, code: '123456', purpose: row.purpose });
    },
    async logout() {
      await gate();
      const token = tokens.access();
      if (token) world.access.delete(token);
    },
    async getMe() {
      await gate();
      const row = accessOf(world, tokens);
      const staff = STAFF.filter((person) => person.phone === row.phone);
      return {
        id: `usr_${row.phone.slice(-4)}`,
        firstName: staff[0]?.firstName ?? 'Owner',
        phone: row.phone,
        venues: staff.flatMap((person) => {
          const venue = world.venues[person.slug];
          return venue ? [{ venueId: venue.id, name: venue.name, role: person.role }] : [];
        }),
      };
    },
    async createGuestSession(body) {
      await gate();
      const venue = venueBySlug(world, body.venueSlug);
      const tableCode = body.tableCode ?? null;
      if (
        tableCode &&
        !/^([1-9]|[1-3]\d|40)$/.test(tableCode) &&
        !world.tables[venue.id]?.some((table) => table.code === tableCode)
      ) {
        throw new ApiError(404, 'venue_not_found', 'That table code is not in this venue');
      }
      const token = `gst_${venue.slug}_${tableCode ?? 'walkin'}_${nextId(world, 's')}`;
      const open = world.orders.find(
        (item) =>
          item.order.venueId === venue.id &&
          item.order.tableCode === tableCode &&
          item.order.status !== 'served' &&
          item.order.status !== 'cancelled',
      );
      const orderId = open?.order.id ?? null;
      world.sessions.set(token, { slug: venue.slug, tableCode, orderId });
      rememberOpenOrder(token, orderId);
      const table =
        world.tables[venue.id]?.find((item) => item.code === tableCode) ??
        (tableCode
          ? {
              id: `tbl_${tableCode}`,
              code: tableCode,
              label: `Table ${tableCode}`,
              qrUrl: `https://ozaa.app/${venue.slug}/t/${tableCode}`,
            }
          : undefined);
      return {
        guestToken: token,
        expiresAt: new Date(now() + 12 * 3600_000).toISOString(),
        venue: publicVenue(venue, world.notices[venue.slug], now()),
        table,
      };
    },
    async getVenue(slug, call) {
      await gate();
      const found = venueBySlug(world, slug);
      const venue = publicVenue(found, world.notices[found.slug], now());
      const tag = etag(venue);
      if (call?.ifNoneMatch === tag) throw new ApiError(304, 'not_modified', 'Not modified');
      return venue;
    },
    async getMenu(slug, call) {
      await gate();
      const venue = venueBySlug(world, slug);
      const menu = world.menus[slug];
      if (!menu) throw new ApiError(404, 'order_not_found', 'Menu not found');
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
        const lines = body.lines.map((line) => {
          const item = menu.items.find((candidate) => candidate.id === line.menuItemId);
          if (!item) throw new ApiError(422, 'item_sold_out', 'That dish is not on the menu');
          const check = checkLine(item, line.quantity);
          if (check === 'sold_out') throw new ApiError(422, 'item_sold_out', 'Sold out');
          if (check === 'out_of_range') {
            throw new ApiError(
              422,
              'quantity_out_of_range',
              'Change how many you want of this dish',
            );
          }
          const chosen = line.modifierOptionIds ?? [];
          const modifiers = item.modifierGroups.flatMap((group) =>
            group.options
              .filter((option) => chosen.includes(option.id))
              .map((option) => ({ name: option.name.en, pricePesewas: option.pricePesewas })),
          );
          const extra = modifiers.reduce((sum, option) => sum + option.pricePesewas, 0);
          // The sale price, when there is one, is what the guest pays (dishRules.unitPrice).
          const unit = unitPrice(item);
          const total = (unit + extra) * line.quantity;
          return {
            id: nextId(world, 'oln'),
            menuItemId: item.id,
            name: item.name.en,
            quantity: line.quantity,
            modifiers,
            unitPricePesewas: unit,
            totalPesewas: total,
            note: line.note,
            paid: false,
          };
        });
        // Stock: two lines of the same dish count together, and nothing is taken until every line is fine.
        const wanted = new Map<string, number>();
        for (const line of body.lines) {
          wanted.set(line.menuItemId, (wanted.get(line.menuItemId) ?? 0) + line.quantity);
        }
        for (const [id, quantity] of wanted) {
          const item = menu.items.find((candidate) => candidate.id === id);
          if (item?.stockCount != null && quantity > item.stockCount) {
            throw new ApiError(422, 'item_sold_out', 'Not enough left');
          }
        }
        for (const [id, quantity] of wanted) {
          const index = menu.items.findIndex((candidate) => candidate.id === id);
          const item = menu.items[index];
          if (item) menu.items[index] = { ...item, ...takeStock(item, quantity) };
        }
        const subtotal = lines.reduce((sum, line) => sum + line.totalPesewas, 0);
        const order: Order = {
          id: nextId(world, 'ord'),
          number: 100 + world.orders.length,
          venueId: venue.id,
          tableCode: session.tableCode,
          status: 'received',
          paymentStatus: 'unpaid',
          lines,
          subtotalPesewas: subtotal,
          taxes: [],
          totalPesewas: subtotal,
          paidPesewas: 0,
          etaMinutes: 12,
          createdAt: new Date(now()).toISOString(),
          updatedAt: new Date(now()).toISOString(),
          readyAt: null,
        };
        world.orders.push({ order, receivedAt: now(), manual: false });
        session.orderId = order.id;
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
        live.order.lines.map((line) => ({
          id: line.id,
          totalPesewas: pesewas(line.totalPesewas),
          paid: line.paid,
        })),
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
      const quoteId = nextId(world, 'quo');
      world.quotes.set(quoteId, {
        orderId,
        share: quote.sharePesewas,
        tip: quote.tipPesewas,
        lineIds: body.lineIds ?? [],
        expiresAt: now() + 10 * 60_000,
      });
      return { quoteId, orderId, ...quote, expiresAt: new Date(now() + 10 * 60_000).toISOString() };
    },
    async initializePayment(body, call) {
      await gate();
      return remember(call.idempotencyKey, () => {
        const quote = world.quotes.get(body.quoteId);
        if (!quote || quote.expiresAt < now())
          throw new ApiError(409, 'quote_expired', 'That bill changed. Ask for a new total.');
        const reference = nextId(world, 'pay');
        const createdAt = new Date(now()).toISOString();
        const payment: Payment = {
          id: reference,
          reference,
          orderId: quote.orderId,
          method: body.method,
          provider: body.momo?.provider,
          amountPesewas: quote.share + quote.tip,
          tipPesewas: quote.tip,
          currency: 'GHS',
          status: body.method === 'momo' ? 'pay_offline' : 'open_url',
          displayText:
            body.method === 'momo' ? 'Check your phone and enter your PIN to approve.' : undefined,
          authorizationUrl:
            body.method === 'card' ? `https://mock.ozaa.app/checkout/${reference}` : undefined,
          approveBy: body.method === 'momo' ? new Date(now() + 180_000).toISOString() : null,
          createdAt,
          paidAt: null,
          testMode: true,
        };
        world.payments.set(reference, { payment, phone: body.momo?.phone ?? '', applied: false });
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
    async paystackWebhook() {
      await gate();
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
    async getVenueLoyaltyProgram(slug) {
      await gate();
      const venue = venueBySlug(world, slug);
      const current = world.loyalty[venue.id] ?? blankVenue(venue.id, venue.currency);
      return toWire(current, { kind: 'programme' }) as LoyaltyProgram;
    },
    async getMyLoyaltyCard(slug) {
      await gate();
      const row = loyaltyOf(world, tokens);
      const venue = venueBySlug(world, slug);
      const current = world.loyalty[venue.id] ?? blankVenue(venue.id, venue.currency);
      const wire = toWire(current, { kind: 'card', phone: samplePhone(row.phone) });
      if (!wire) {
        const problem = LOYALTY_PROBLEMS.not_a_member;
        throw new ApiError(problem.status, 'not_a_member', problem.title);
      }
      return wire as LoyaltyCard;
    },
    async joinLoyalty(slug, body) {
      await gate();
      const row = loyaltyOf(world, tokens);
      const venue = venueBySlug(world, slug);
      const phone = samplePhone(row.phone);
      const { venue: next } = keepLoyalty(
        world,
        venue.id,
        {
          type: 'join',
          phone,
          firstName: body.firstName,
          birthdayMonthDay: body.birthdayMonthDay,
          consent: body.consent,
          random,
        },
        new Date(now()).toISOString(),
      );
      return toWire(next, { kind: 'card', phone }) as LoyaltyCard;
    },
    async leaveLoyalty(slug) {
      await gate();
      const row = loyaltyOf(world, tokens);
      const venue = venueBySlug(world, slug);
      keepLoyalty(
        world,
        venue.id,
        { type: 'leave', phone: samplePhone(row.phone) },
        new Date(now()).toISOString(),
      );
    },
    async redeemReward(slug, body, call) {
      await gate();
      return remember(call.idempotencyKey, () => {
        const row = loyaltyOf(world, tokens);
        const venue = venueBySlug(world, slug);
        const phone = samplePhone(row.phone);
        const { venue: next } = keepLoyalty(
          world,
          venue.id,
          { type: 'open_claim', phone, rewardId: body.rewardId, random },
          new Date(now()).toISOString(),
        );
        return toWire(next, { kind: 'card', phone }) as LoyaltyCard;
      });
    },
    async createReview(body) {
      await gate();
      const session = sessionOf(world, tokens);
      const venue = venueBySlug(world, session.slug);
      const id = nextId(world, 'rev');
      // Stored so it shows on the owner's Reviews page. Guest sessions carry no name (Act 843).
      world.written.push({
        id,
        venueId: venue.id,
        stars: body.stars,
        firstName: 'Guest',
        text: body.text,
        highlights: body.highlights,
        createdAt: new Date(now()).toISOString(),
        reply: null,
      });
      // Reviews are not routed by stars: every guest gets the same reply.
      return { id, googleReviewUrl: null };
    },
    async getLeaderboard(slug) {
      await gate();
      venueBySlug(world, slug);
      const venue = venueBySlug(world, slug);
      return {
        period: 'week',
        entries: [],
        stampRule: venue.game ?? { enabled: false, minScore: 15 },
      };
    },
    async submitScore(slug, body) {
      await gate();
      const venue = venueBySlug(world, slug);
      const target = venue.game?.minScore ?? 15;
      const loyaltyToken = tokens.loyalty?.() ?? tokens.access();
      const loyalty = loyaltyToken ? world.access.get(loyaltyToken) : undefined;
      let stampEarned = Boolean(venue.game?.enabled) && body.score >= target;
      if (loyalty?.purpose === 'guest_loyalty' && isGhanaPhone(loyalty.phone)) {
        const step = keepLoyalty(
          world,
          venue.id,
          {
            type: 'game_win',
            phone: ghanaPhone(loyalty.phone),
            runId: body.runId,
            score: body.score,
            minScore: target,
            enabled: Boolean(venue.game?.enabled),
          },
          new Date(now()).toISOString(),
        );
        stampEarned = step.effect === 'posted';
      }
      return { rank: body.score > 0 ? 1 : null, stampEarned };
    },
    async sendFeedback(body) {
      await gate();
      const session = sessionOf(world, tokens);
      const venue = venueBySlug(world, session.slug);
      const created = now();
      world.feedback.push({
        id: nextId(world, 'fbk'),
        venueId: venue.id,
        // The real server scores the note's mood; the mock files every new note as neutral.
        sentiment: 'neutral',
        score: 3,
        text: body.message,
        photoUrl: null,
        contactName: null,
        contactPhone: body.contactPhone ?? null,
        archived: false,
        // Held back two hours so a guest is not identified by when they sat down.
        visibleAfter: new Date(created + 2 * 3600_000).toISOString(),
        createdAt: new Date(created).toISOString(),
      });
    },
    async ownerGetVenue(venueId) {
      await gate();
      accessOf(world, tokens);
      const venue = venueById(world, venueId);
      return {
        ...venue,
        wifi: world.wifi[venue.slug],
        noticeSettings: world.notices[venue.slug] ?? { banner: null, popup: null },
      };
    },
    async ownerUpdateVenue(venueId, body) {
      await gate();
      accessOf(world, tokens);
      const venue = venueById(world, venueId);
      const { bannerMediaId, logoMediaId, noticeSettings, ...fields } = body;
      const banner = mockUploadedImage(bannerMediaId) ?? venue.banner;
      const logo = logoMediaId === null ? null : (mockUploadedImage(logoMediaId) ?? venue.logo);
      const next = {
        ...venue,
        ...fields,
        banner,
        logo,
        location: body.location ? { ...venue.location, ...body.location } : venue.location,
        // Saving one menu style choice keeps the others.
        menuStyle: body.menuStyle ? { ...venue.menuStyle, ...body.menuStyle } : venue.menuStyle,
      };
      world.venues[venue.slug] = next;
      if (body.wifi) world.wifi[venue.slug] = body.wifi;
      if (noticeSettings) {
        const current = world.notices[venue.slug] ?? { banner: null, popup: null };
        world.notices[venue.slug] = { ...current, ...noticeSettings };
      }
      return {
        ...next,
        wifi: world.wifi[venue.slug],
        noticeSettings: world.notices[venue.slug] ?? { banner: null, popup: null },
      };
    },
    async ownerSetTheme(venueId, body) {
      await gate();
      accessOf(world, tokens);
      const venue = venueById(world, venueId);
      const theme = themeOf(body.accent, body.fontPair);
      world.venues[venue.slug] = { ...venue, theme };
      return theme;
    },
    async ownerCreateMediaUpload() {
      await gate();
      const mediaId = nextId(world, 'med');
      return {
        mediaId,
        uploadUrl: `https://mock.ozaa.app/upload/${mediaId}`,
        expiresAt: new Date(now() + 15 * 60_000).toISOString(),
      };
    },
    async ownerGetServices(venueId) {
      await gate();
      return serviceSettings(venueById(world, venueId));
    },
    async ownerSetServices(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      world.venues[venue.slug] = { ...venue, services: body.services, game: body.game };
      return serviceSettings(world.venues[venue.slug]!);
    },
    async ownerListStaff(venueId) {
      await gate();
      return { items: world.staff.filter((person) => person.venueId === venueId) };
    },
    async ownerInviteStaff(venueId, body) {
      await gate();
      const member: World['staff'][number] = {
        id: nextId(world, 'stf'),
        firstName: body.firstName,
        role: body.role,
        phoneMasked: `0${body.phone.slice(4, 6)} *** ${body.phone.slice(-4)}`,
        status: 'invited',
        venueId,
        phone: body.phone,
      };
      world.staff.push(member);
      return member;
    },
    async ownerListCategories(venueId) {
      await gate();
      const venue = venueById(world, venueId);
      return { items: world.menus[venue.slug]?.categories ?? [] };
    },
    async ownerCreateCategory(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const menu = world.menus[venue.slug];
      if (!menu) throw new ApiError(404, 'order_not_found', 'Menu not found');
      const category = {
        id: nextId(world, 'cat'),
        name: body.name,
        kind: body.kind,
        position: body.position ?? menu.categories.length,
        schedule: body.schedule,
        hidden: body.hidden ?? false,
      };
      menu.categories.push(category);
      return category;
    },
    async ownerUpdateCategory(venueId, categoryId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const category = world.menus[venue.slug]?.categories.find((item) => item.id === categoryId);
      if (!category) throw new ApiError(404, 'order_not_found', 'Category not found');
      category.name = body.name;
      category.kind = body.kind;
      if (body.position !== undefined) category.position = body.position;
      if (body.schedule !== undefined) category.schedule = body.schedule;
      if (body.hidden !== undefined) category.hidden = body.hidden;
      return category;
    },
    async ownerDeleteCategory(venueId, categoryId) {
      await gate();
      const venue = venueById(world, venueId);
      const menu = world.menus[venue.slug];
      if (!menu) return;
      menu.categories = menu.categories.filter((item) => item.id !== categoryId);
    },
    async ownerCreateItem(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const menu = world.menus[venue.slug];
      if (!menu || !body.categoryId || !body.name || body.pricePesewas === undefined) {
        throw new ApiError(400, 'bad_request', 'Add a name, price and category');
      }
      const item = {
        id: nextId(world, 'itm'),
        categoryId: body.categoryId,
        name: body.name,
        description: body.description ?? { en: '' },
        pricePesewas: body.pricePesewas,
        photo: mockUploadedImage(body.photoMediaId) ?? null,
        available: body.available ?? true,
        dietary: body.dietary ?? [],
        dietaryCustom: body.dietaryCustom ?? [],
        allergens: body.allergens ?? [],
        calories: body.calories,
        badges: body.badges ?? [],
        modifierGroups: body.modifierGroups ?? [],
        prepMinutes: body.prepMinutes,
        hidden: body.hidden ?? false,
        salePricePesewas: body.salePricePesewas ?? null,
        stockCount: body.stockCount ?? null,
        minQuantity: body.minQuantity,
        maxQuantity: body.maxQuantity,
        // Like the server: a dish added with nothing in stock starts sold out.
        ...(body.stockCount === 0 ? { available: false } : {}),
      };
      menu.items.push(item);
      return item;
    },
    async ownerUpdateItem(venueId, itemId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const menu = world.menus[venue.slug];
      const index = menu?.items.findIndex((item) => item.id === itemId) ?? -1;
      if (!menu || index < 0) throw new ApiError(404, 'order_not_found', 'Dish not found');
      const current = menu.items[index];
      if (!current) throw new ApiError(404, 'order_not_found', 'Dish not found');
      // photoMediaId: undefined keeps the photo, null removes it, an id swaps in the uploaded one.
      const photo =
        body.photoMediaId === undefined
          ? current.photo
          : body.photoMediaId === null
            ? null
            : (mockUploadedImage(body.photoMediaId) ?? current.photo);
      const { photoMediaId: _photoMediaId, ...fields } = body;
      const next = { ...current, ...fields, photo };
      // Setting the stock to 0 sells the dish out, as the server does.
      if (body.stockCount === 0) next.available = false;
      menu.items[index] = next;
      return next;
    },
    async ownerDeleteItem(venueId, itemId) {
      await gate();
      const venue = venueById(world, venueId);
      const menu = world.menus[venue.slug];
      if (!menu) return;
      menu.items = menu.items.filter((item) => item.id !== itemId);
    },
    async ownerListTables(venueId) {
      await gate();
      return { items: world.tables[venueId] ?? [] };
    },
    async ownerCreateTables(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const created = body.codes.map((code) => ({
        id: `tbl_${venue.slug}_${code}`,
        code,
        label: `Table ${code}`,
        qrUrl: `https://ozaa.app/${venue.slug}/t/${code}`,
      }));
      world.tables[venueId] = [...(world.tables[venueId] ?? []), ...created];
      return { items: created };
    },
    async ownerGetTableQr(venueId, tableId) {
      await gate();
      const table = (world.tables[venueId] ?? []).find((item) => item.id === tableId);
      if (!table?.qrUrl) throw new ApiError(404, 'venue_not_found', 'Table not found');
      return qrSvg(table.qrUrl, 256);
    },
    async ownerListOrders(venueId) {
      await gate();
      const items = world.orders
        .filter((item) => item.order.venueId === venueId)
        .map((item) => fresh(world, item, now(), fast));
      return { items, nextCursor: null as string | null };
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
    async ownerRecordCashPayment(orderId, body) {
      await gate();
      const live = findOrder(world, orderId);
      const paid = live.order.paidPesewas + body.amountPesewas;
      live.order = {
        ...live.order,
        paidPesewas: paid,
        paymentStatus: paid >= live.order.totalPesewas ? 'paid' : 'part_paid',
      };
      return live.order;
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
    async ownerGetLoyalty(venueId) {
      await gate();
      const venue = venueById(world, venueId);
      const current = world.loyalty[venueId] ?? blankVenue(venueId, venue.currency);
      return toWire(current, { kind: 'programme' }) as LoyaltyProgram;
    },
    async ownerSetLoyalty(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const { venue: next } = keepLoyalty(
        world,
        venueId,
        { type: 'save_programme', input: body, venueCurrency: venue.currency, random },
        new Date(now()).toISOString(),
      );
      return toWire(next, { kind: 'programme' }) as LoyaltyProgram;
    },
    async ownerListLoyaltyMembers(venueId) {
      await gate();
      const venue = venueById(world, venueId);
      const current = world.loyalty[venueId] ?? blankVenue(venueId, venue.currency);
      return { items: toWire(current, { kind: 'roster' }) as LoyaltyCard[], nextCursor: null };
    },
    async ownerConfirmRedemption(venueId, body, call) {
      await gate();
      return remember(call?.idempotencyKey, () => {
        venueById(world, venueId);
        const { venue: next, memberId } = keepLoyalty(
          world,
          venueId,
          { type: 'confirm', code: body.code },
          new Date(now()).toISOString(),
        );
        const card = memberId ? toWire(next, { kind: 'member', memberId }) : null;
        if (!card) throw new ApiError(404, 'claim_unknown', LOYALTY_PROBLEMS.claim_unknown.title);
        return card as LoyaltyCard;
      });
    },
    async ownerGetPayoutAccount(venueId) {
      await gate();
      const account = world.payouts[venueId];
      if (!account) throw new ApiError(404, 'venue_not_found', 'No payout account yet');
      return account;
    },
    async ownerSetPayoutAccount(venueId, body) {
      await gate();
      const masked =
        body.settlement.type === 'bank'
          ? `**** ${body.settlement.accountNumber.slice(-4)}`
          : `**** ${body.settlement.phone.slice(-4)}`;
      const account = {
        businessName: body.businessName,
        settlementType: body.settlement.type,
        accountMasked: masked,
        verified: false,
        ozaaFeePercent: world.payouts[venueId]?.ozaaFeePercent ?? 0,
      };
      world.payouts[venueId] = account;
      return account;
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
    async ownerListWrittenReviews(venueId) {
      await gate();
      accessOf(world, tokens);
      return writtenFor(world, venueId);
    },
    async ownerReplyToReview(reviewId, body, call) {
      await gate();
      accessOf(world, tokens);
      return remember(call?.idempotencyKey, () => replyFor(world, reviewId, body.text));
    },
    async ownerGetInsights(venueId, range = '7d') {
      await gate();
      accessOf(world, tokens);
      return insightsFor(world, venueId, range);
    },
    async ownerRevokeStaff(venueId, staffId) {
      await gate();
      world.staff = world.staff.filter((s) => s.id !== staffId);
    },
    async ownerListFeedback(venueId, query) {
      await gate();
      const nowTime = now();
      let items = (world.feedback ?? []).filter((fb) => fb.venueId === venueId);
      // Enforce anonymity delay: items with future visibleAfter remain hidden
      items = items.filter((fb) => new Date(fb.visibleAfter).getTime() <= nowTime);
      if (query?.state === 'new') items = items.filter((fb) => !fb.archived);
      else if (query?.state === 'archived') items = items.filter((fb) => fb.archived);
      if (query?.search) {
        const q = query.search.toLowerCase();
        items = items.filter(
          (fb) =>
            fb.text.toLowerCase().includes(q) ||
            (fb.contactName?.toLowerCase().includes(q) ?? false) ||
            (fb.contactPhone?.includes(q) ?? false),
        );
      }
      return { items };
    },
    async ownerArchiveFeedback(venueId, feedbackId, body) {
      await gate();
      const item = (world.feedback ?? []).find((fb) => fb.id === feedbackId);
      if (!item) throw new ApiError(404, 'not_found', 'Feedback item not found');
      item.archived = body.archived;
      return item;
    },
    async ownerAskFeedbackAi(venueId, body) {
      await gate();
      const nowTime = now();
      const items = (world.feedback ?? []).filter(
        (fb) => fb.venueId === venueId && new Date(fb.visibleAfter).getTime() <= nowTime,
      );
      if (items.length === 0) {
        return {
          reply:
            "I haven't found any feedback yet for this location. Once diners leave feedback via the suggestion box, I will summarise trends and complaints here.",
          suggestions: [
            'Summarise my recent feedback',
            'What are my biggest complaints?',
            'What are customers loving?',
            'How has feedback changed this month?',
          ],
        };
      }
      const q = body.question.toLowerCase();
      if (q.includes('complaint') || q.includes('biggest')) {
        return {
          reply:
            'Based on recent feedback, 1 customer noted that kelewele was too salty and requested faster bill settlement, while another mentioned a 25-minute wait during Friday peak dinner. Overall complaints are low at under 15% of submissions.',
          suggestions: [
            'How can we speed up Friday wait times?',
            'Summarise positive comments',
            'View unhappy customer contact notes',
          ],
        };
      }
      if (q.includes('loving') || q.includes('love') || q.includes('positive')) {
        return {
          reply:
            'Guests consistently praise the grilled lake tilapia with spicy shito and the smoky firewood jollof rice. Several guests specifically mentioned warm hospitality from floor staff.',
          suggestions: ['What are our top dishes by rating?', 'Show recent 5-star comments'],
        };
      }
      return {
        reply:
          'Analyzed ' +
          items.length +
          ' feedback submissions: 75% positive, 15% neutral, and 10% negative. Top praise focuses on food seasoning and vibe. Suggestions center on peak-hour billing speed.',
        suggestions: [
          'What are my biggest complaints?',
          'What are customers loving?',
          'Summarise my recent feedback',
        ],
      };
    },
    async ownerListCustomLinks(venueId) {
      await gate();
      return {
        items: (world.customLinks ?? [])
          .filter((l) => l.venueId === venueId)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      };
    },
    async ownerCreateCustomLink(venueId, body) {
      await gate();
      const link = {
        id: nextId(world, 'lnk'),
        venueId,
        title: body.title,
        url: body.url,
        icon: body.icon ?? 'globe',
        placement: body.placement ?? 'button',
        startDate: body.startDate ?? null,
        endDate: body.endDate ?? null,
        sortOrder: body.sortOrder ?? (world.customLinks?.length ?? 0) + 1,
        clicks: 0,
        enabled: body.enabled ?? true,
      };
      world.customLinks.push(link);
      return link;
    },
    async ownerUpdateCustomLink(venueId, linkId, body) {
      await gate();
      const link = (world.customLinks ?? []).find((l) => l.id === linkId);
      if (!link) throw new ApiError(404, 'not_found', 'Custom link not found');
      if (body.title !== undefined) link.title = body.title;
      if (body.url !== undefined) link.url = body.url;
      if (body.icon !== undefined) link.icon = body.icon;
      if (body.placement !== undefined) link.placement = body.placement;
      if (body.startDate !== undefined) link.startDate = body.startDate;
      if (body.endDate !== undefined) link.endDate = body.endDate;
      if (body.sortOrder !== undefined) link.sortOrder = body.sortOrder;
      if (body.enabled !== undefined) link.enabled = body.enabled;
      return link;
    },
    async ownerDeleteCustomLink(venueId, linkId) {
      await gate();
      world.customLinks = (world.customLinks ?? []).filter((l) => l.id !== linkId);
    },
    async ownerGetLoyaltyAnalytics(venueId, range = '30d') {
      await gate();
      const scale = range === '7d' ? 1 : range === '90d' ? 6 : 3;
      return {
        range,
        enrolledCount: 76 * scale,
        stampsIssued: 312 * scale,
        rewardsRedeemed: 28 * scale,
        newEnrollments: 22 * scale,
        series: [
          { date: 'Mon', newEnrollments: 3, stampsIssued: 14, rewardsRedeemed: 1 },
          { date: 'Tue', newEnrollments: 5, stampsIssued: 20, rewardsRedeemed: 2 },
          { date: 'Wed', newEnrollments: 4, stampsIssued: 18, rewardsRedeemed: 1 },
          { date: 'Thu', newEnrollments: 8, stampsIssued: 28, rewardsRedeemed: 3 },
          { date: 'Fri', newEnrollments: 12, stampsIssued: 45, rewardsRedeemed: 5 },
          { date: 'Sat', newEnrollments: 16, stampsIssued: 62, rewardsRedeemed: 8 },
          { date: 'Sun', newEnrollments: 11, stampsIssued: 51, rewardsRedeemed: 6 },
        ],
      };
    },
    async ownerListLoyaltyCustomers(venueId, query) {
      await gate();
      let customers = [
        {
          id: 'cst_1',
          name: 'Kofi Mensah',
          phoneMasked: '024 *** 4567',
          email: 'kofi@example.com',
          stamps: 8,
          rewardsAvailable: 1,
          wantsOffers: true,
          lastStampAt: new Date(now() - 3600_000 * 2).toISOString(),
        },
        {
          id: 'cst_2',
          name: 'Abena Osei',
          phoneMasked: '020 *** 9821',
          email: 'abena@example.com',
          stamps: 4,
          rewardsAvailable: 0,
          wantsOffers: true,
          lastStampAt: new Date(now() - 3600_000 * 26).toISOString(),
        },
        {
          id: 'cst_3',
          name: 'Kwame Asante',
          phoneMasked: '055 *** 1122',
          email: null,
          stamps: 10,
          rewardsAvailable: 2,
          wantsOffers: false,
          lastStampAt: new Date(now() - 3600_000 * 72).toISOString(),
        },
        {
          id: 'cst_4',
          name: 'Yaa Konadu',
          phoneMasked: '024 *** 3344',
          email: 'yaa@example.com',
          stamps: 2,
          rewardsAvailable: 0,
          wantsOffers: true,
          lastStampAt: new Date(now() - 3600_000 * 120).toISOString(),
        },
      ];
      if (query?.wantsOffers) customers = customers.filter((c) => c.wantsOffers);
      if (query?.search) {
        const q = query.search.toLowerCase();
        customers = customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phoneMasked.includes(q) ||
            (c.email?.toLowerCase().includes(q) ?? false),
        );
      }
      return { items: customers, totalCount: customers.length };
    },
    async ownerScanLoyaltyCard(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const current = world.loyalty[venueId] ?? blankVenue(venueId, venue.currency);
      const card = toWire(current, {
        kind: 'member',
        memberId: 'mem_sample',
      }) as LoyaltyCard | null;
      if (!card) throw new ApiError(404, 'card_not_found', 'No loyalty card found for that code');
      if (body.action === 'stamp') {
        return {
          success: true,
          card,
          customerName: 'Kofi Mensah',
          stamps: 8,
          cooldownViolated: false,
          cooldownRemainingSeconds: 0,
          rewardUnlocked: false,
          message: '+1 Stamp recorded successfully.',
        };
      }
      return {
        success: true,
        card,
        customerName: 'Kofi Mensah',
        stamps: 0,
        cooldownViolated: false,
        cooldownRemainingSeconds: 0,
        rewardUnlocked: true,
        message: 'Reward Free Jollof redeemed successfully.',
      };
    },
    async ownerGetBusiness() {
      await gate();
      return world.business;
    },
    async ownerUpdateBusiness(body) {
      await gate();
      world.business.business.name = body.name;
      return world.business.business;
    },
    async ownerCreateLocation(body) {
      await gate();
      const loc = {
        id: nextId(world, 'ven'),
        businessId: world.business.business.id,
        slug: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: body.name,
        email: null,
        phone: null,
        address1: body.address1 ?? null,
        address2: null,
        city: body.city ?? null,
        postcode: body.postcode ?? null,
        country: body.country,
        currency: 'GHS' as const,
      };
      world.business.locations.push(loc);
      return loc;
    },
    async ownerUpdateLocation(locationId, body) {
      await gate();
      const loc = world.business.locations.find((l) => l.id === locationId);
      if (!loc) throw new ApiError(404, 'not_found', 'Location not found');
      if (body.name !== undefined) loc.name = body.name;
      if (body.email !== undefined) loc.email = body.email;
      if (body.phone !== undefined) loc.phone = body.phone;
      if (body.address1 !== undefined) loc.address1 = body.address1;
      if (body.address2 !== undefined) loc.address2 = body.address2;
      if (body.city !== undefined) loc.city = body.city;
      if (body.postcode !== undefined) loc.postcode = body.postcode;
      if (body.country !== undefined) loc.country = body.country;
      return loc;
    },
    async ownerListScannerDevices(venueId) {
      await gate();
      return { items: (world.devices ?? []).filter((d) => d.venueId === venueId) };
    },
    async ownerPairScannerDevice(venueId, body) {
      await gate();
      const device = {
        id: nextId(world, 'dev'),
        venueId,
        name: body.name,
        platform: 'Android / iOS',
        pairedAt: new Date(now()).toISOString(),
        lastSeen: new Date(now()).toISOString(),
        pairingCode: body.code ? null : '842916',
      };
      world.devices.push(device);
      return device;
    },
    async ownerRevokeScannerDevice(venueId, deviceId) {
      await gate();
      world.devices = (world.devices ?? []).filter((d) => d.id !== deviceId);
    },
    async deleteAccount() {
      await gate();
    },
  };

  return api;
}

export { decideMockCard };
