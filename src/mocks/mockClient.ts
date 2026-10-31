import { isRewardReady, stampsAfterPaidOrder, stampsAfterRedeem } from '../features/loyalty/loyaltyRules';
import { orderTransition } from '../features/orders/orderMachine';
import { quoteBill } from '../features/pay/quoteBill';
import { deriveTheme } from '../features/theming/deriveTheme';
import { pesewas } from '@/lib/brand';
import type { ApiClient, TokenSource } from '@/lib/api/client';
import { ApiError, OfflineError } from '@/lib/api/errors';
import type { Order, Payment, VenueTheme } from '@/lib/api/types';
import { qrSvg } from '@/lib/qrSvg';
import { dashboardFor, floorFor, insightsFor, refundFor, replyFor, transactionsFor, writtenFor } from './ownerDesk';
import { decideMockCard, readMockCard } from './cardBox';
import { rememberOpenOrder } from './openOrder';
import {
  createWorld,
  findOrder,
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
        readyAt: status === 'ready' || status === 'served' ? new Date(now).toISOString() : live.order.readyAt,
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
      if (digit === '9' && clock >= approveBy) row.payment = { ...row.payment, status: 'abandoned' };
      else if (digit === '0' && elapsed >= 5_000) {
        row.payment = { ...row.payment, status: 'failed', failureReason: 'Not enough money in the wallet.' };
      } else if (digit !== '9' && digit !== '0' && elapsed >= 5_000 && row.payment.method === 'momo') {
        row.payment = { ...row.payment, status: 'succeeded', paidAt: new Date(clock).toISOString() };
      }
    }
    if (row.payment.status === 'succeeded' && !row.applied) {
      row.applied = true;
      const quote = [...world.quotes.values()].find((item) => world.payments.get(reference));
      const live = findOrder(world, row.payment.orderId);
      const share = row.payment.amountPesewas - (row.payment.tipPesewas ?? 0);
      const paid = live.order.paidPesewas + share;
      const lineIds = quote && quote.orderId === live.order.id ? quote.lineIds : [];
      const lines = live.order.lines.map((line) => (lineIds.includes(line.id) ? { ...line, paid: true } : line));
      live.order = {
        ...live.order,
        lines,
        paidPesewas: paid,
        paymentStatus: paid >= live.order.totalPesewas ? 'paid' : 'part_paid',
        updatedAt: new Date(clock).toISOString(),
      };
      const access = tokens.access();
      const loyalty = access ? world.access.get(access) : undefined;
      if (loyalty?.purpose === 'guest_loyalty' && live.order.paymentStatus === 'paid') {
        const venue = venueById(world, live.order.venueId);
        const key = `${venue.slug}:${loyalty.phone}`;
        const card = world.cards[key];
        if (card) {
          const stamps = stampsAfterPaidOrder(card.stamps);
          world.cards[key] = { ...card, stamps, rewardReady: isRewardReady(stamps, card.stampsNeeded) };
        }
      }
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
      if (tableCode && !/^([1-9]|[1-3]\d|40)$/.test(tableCode) && !world.tables[venue.id]?.some((table) => table.code === tableCode)) {
        throw new ApiError(404, 'venue_not_found', 'That table code is not in this venue');
      }
      const token = `gst_${venue.slug}_${tableCode ?? 'walkin'}_${nextId(world, 's')}`;
      const open = world.orders.find((item) => item.order.venueId === venue.id && item.order.tableCode === tableCode && item.order.status !== 'served' && item.order.status !== 'cancelled');
      const orderId = open?.order.id ?? null;
      world.sessions.set(token, { slug: venue.slug, tableCode, orderId });
      rememberOpenOrder(token, orderId);
      const table = world.tables[venue.id]?.find((item) => item.code === tableCode) ?? (tableCode ? { id: `tbl_${tableCode}`, code: tableCode, label: `Table ${tableCode}`, qrUrl: `https://ozaa.app/${venue.slug}/t/${tableCode}` } : undefined);
      return { guestToken: token, expiresAt: new Date(now() + 12 * 3600_000).toISOString(), venue: publicVenue(venue), table };
    },
    async getVenue(slug, call) {
      await gate();
      const venue = publicVenue(venueBySlug(world, slug));
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
    async listStories(slug) {
      await gate();
      const venue = venueBySlug(world, slug);
      const featured = world.videos.filter((video) => video.venueId === venue.id && video.state === 'featured');
      if (featured.length > 0) return { items: featured };
      return { items: world.stories[slug] ?? [] };
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
          if (!item.available) throw new ApiError(422, 'item_sold_out', 'Sold out');
          const chosen = line.modifierOptionIds ?? [];
          const modifiers = item.modifierGroups.flatMap((group) =>
            group.options.filter((option) => chosen.includes(option.id)).map((option) => ({ name: option.name.en, pricePesewas: option.pricePesewas })),
          );
          const extra = modifiers.reduce((sum, option) => sum + option.pricePesewas, 0);
          const total = (item.pricePesewas + extra) * line.quantity;
          return {
            id: nextId(world, 'oln'),
            menuItemId: item.id,
            name: item.name.en,
            quantity: line.quantity,
            modifiers,
            unitPricePesewas: item.pricePesewas,
            totalPesewas: total,
            note: line.note,
            paid: false,
          };
        });
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
      if (call?.ifNoneMatch === etag(order)) throw new ApiError(304, 'not_modified', 'Not modified');
      return order;
    },
    async quoteBill(orderId, body) {
      await gate();
      const live = findOrder(world, orderId);
      const quote = quoteBill(
        live.order.lines.map((line) => ({ id: line.id, totalPesewas: pesewas(line.totalPesewas), paid: line.paid })),
        { mode: body.mode, parts: body.parts, lineIds: body.lineIds, tip: body.tip ? { percent: body.tip.percent, customPesewas: body.tip.customPesewas !== undefined ? pesewas(body.tip.customPesewas) : undefined } : undefined },
      );
      const quoteId = nextId(world, 'quo');
      world.quotes.set(quoteId, { orderId, share: quote.sharePesewas, tip: quote.tipPesewas, lineIds: body.lineIds ?? [], expiresAt: now() + 10 * 60_000 });
      return { quoteId, orderId, ...quote, expiresAt: new Date(now() + 10 * 60_000).toISOString() };
    },
    async initializePayment(body, call) {
      await gate();
      return remember(call.idempotencyKey, () => {
        const quote = world.quotes.get(body.quoteId);
        if (!quote || quote.expiresAt < now()) throw new ApiError(409, 'quote_expired', 'That bill changed. Ask for a new total.');
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
          displayText: body.method === 'momo' ? 'Check your phone and enter your PIN to approve.' : undefined,
          authorizationUrl: body.method === 'card' ? `https://mock.ozaa.app/checkout/${reference}` : undefined,
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
        if (!session.tableCode) throw new ApiError(400, 'bad_request', 'Scan the code on your table first');
        const open = world.calls.find((item) => item.tableCode === session.tableCode && item.status !== 'resolved');
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
    async getMyLoyaltyCard(slug) {
      await gate();
      const row = accessOf(world, tokens);
      const card = world.cards[`${slug}:${row.phone}`];
      if (!card) throw new ApiError(404, 'not_a_member', 'Not a member yet');
      return card;
    },
    async joinLoyalty(slug, body) {
      await gate();
      if (!body.consent.loyalty) throw new ApiError(400, 'consent_required', 'Tick the loyalty box to join');
      const row = accessOf(world, tokens);
      const venue = venueBySlug(world, slug);
      const program = world.programs[venue.id];
      const existing = world.cards[`${slug}:${row.phone}`];
      const card = existing ?? {
        venueId: venue.id,
        stamps: 0,
        stampsNeeded: program?.stampsNeeded ?? 8,
        reward: program?.reward ?? { id: `rwd_${slug}`, title: 'A free plate', stampsNeeded: 8 },
        rewardReady: false,
        memberSince: new Date(now()).toISOString().slice(0, 10),
        history: [],
        consent: { marketing: body.consent.marketing, at: new Date(now()).toISOString() },
      };
      card.consent = { marketing: body.consent.marketing, at: new Date(now()).toISOString() };
      world.cards[`${slug}:${row.phone}`] = card;
      return card;
    },
    async leaveLoyalty(slug) {
      await gate();
      const row = accessOf(world, tokens);
      delete world.cards[`${slug}:${row.phone}`];
    },
    async redeemReward(slug, body) {
      await gate();
      const row = accessOf(world, tokens);
      const key = `${slug}:${row.phone}`;
      const card = world.cards[key];
      if (!card || !isRewardReady(card.stamps, card.stampsNeeded) || card.reward.id !== body.rewardId) {
        throw new ApiError(409, 'reward_not_ready', 'That reward is not ready');
      }
      const stamps = stampsAfterRedeem(card.stamps, card.stampsNeeded);
      world.cards[key] = { ...card, stamps, rewardReady: isRewardReady(stamps, card.stampsNeeded) };
      return world.cards[key];
    },
    async createReview(body) {
      await gate();
      const session = sessionOf(world, tokens);
      const venue = venueBySlug(world, session.slug);
      return { id: nextId(world, 'rev'), googleReviewUrl: body.stars >= 4 ? (venue.googleReviewUrl ?? null) : null };
    },
    async createVideoUpload(body) {
      await gate();
      if (body.durationSeconds < 15 || body.durationSeconds > 30 || body.sizeBytes > 25_000_000) {
        throw new ApiError(400, 'bad_video', 'Keep the video between 15 and 30 seconds');
      }
      const uploadId = nextId(world, 'upl');
      world.uploads.add(uploadId);
      return { uploadId, uploadUrl: `https://mock.ozaa.app/upload/${uploadId}`, expiresAt: new Date(now() + 15 * 60_000).toISOString() };
    },
    async createVideoReview(body) {
      await gate();
      if (!world.uploads.has(body.uploadId)) throw new ApiError(400, 'bad_video', 'Upload the video first');
      const session = sessionOf(world, tokens);
      const venue = venueBySlug(world, session.slug);
      const id = nextId(world, 'vrv');
      const review = {
        id,
        firstName: body.firstName ?? 'Guest',
        stars: body.stars,
        quote: body.quote,
        postedAt: new Date(now()).toISOString(),
        poster: venue.banner,
        video: { mp4Url: `https://mock.ozaa.app/media/media/review-ama.mp4`, durationSeconds: 18 },
        menuItemId: body.menuItemId,
        sample: true,
        state: 'pending' as const,
        featureConsent: body.featureConsent,
        venueId: venue.id,
      };
      world.videos.push(review);
      return { id, deleteToken: `del_${id}` };
    },
    async deleteMyVideoReview(id, call) {
      await gate();
      const index = world.videos.findIndex((video) => video.id === id);
      if (index < 0 || call.deleteToken !== `del_${id}`) throw new ApiError(404, 'order_not_found', 'Video not found');
      world.videos.splice(index, 1);
    },
    async getLeaderboard(slug) {
      await gate();
      venueBySlug(world, slug);
      const venue = venueBySlug(world, slug);
      return { period: 'week', entries: [], stampRule: venue.game ?? { enabled: false, minScore: 15 } };
    },
    async submitScore(slug, body) {
      await gate();
      const venue = venueBySlug(world, slug);
      const target = venue.game?.minScore ?? 15;
      return { rank: body.score > 0 ? 1 : null, stampEarned: Boolean(venue.game?.enabled) && body.score >= target };
    },
    async sendFeedback() {
      await gate();
      sessionOf(world, tokens);
    },
    async ownerGetVenue(venueId) {
      await gate();
      accessOf(world, tokens);
      const venue = venueById(world, venueId);
      return { ...venue, wifi: world.wifi[venue.slug] };
    },
    async ownerUpdateVenue(venueId, body) {
      await gate();
      accessOf(world, tokens);
      const venue = venueById(world, venueId);
      const next = { ...venue, ...body, location: body.location ? { ...venue.location, ...body.location } : venue.location };
      world.venues[venue.slug] = next;
      if (body.wifi) world.wifi[venue.slug] = body.wifi;
      return { ...next, wifi: world.wifi[venue.slug] };
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
      return { mediaId, uploadUrl: `https://mock.ozaa.app/upload/${mediaId}`, expiresAt: new Date(now() + 15 * 60_000).toISOString() };
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
      const category = { id: nextId(world, 'cat'), name: body.name, kind: body.kind, position: body.position ?? menu.categories.length };
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
        photo: null,
        available: body.available ?? true,
        dietary: body.dietary ?? [],
        badges: body.badges ?? [],
        modifierGroups: body.modifierGroups ?? [],
        prepMinutes: body.prepMinutes,
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
      const next = { ...current, ...body, photo: current.photo };
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
      const created = body.codes.map((code) => ({ id: `tbl_${venue.slug}_${code}`, code, label: `Table ${code}`, qrUrl: `https://ozaa.app/${venue.slug}/t/${code}` }));
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
      const items = world.orders.filter((item) => item.order.venueId === venueId).map((item) => fresh(world, item, now(), fast));
      return { items, nextCursor: null as string | null };
    },
    async ownerSetOrderStatus(orderId, body) {
      await gate();
      const row = accessOf(world, tokens);
      const staff = STAFF.find((person) => person.phone === row.phone);
      const live = findOrder(world, orderId);
      const move = body.status === 'preparing' ? 'start' : body.status === 'ready' ? 'ready' : body.status === 'served' ? 'serve' : body.status === 'cancelled' ? 'cancel' : null;
      const next = move && staff ? orderTransition(live.order.status, move, staff.role) : null;
      if (!next || next !== body.status) throw new ApiError(409, 'illegal_move', 'That status change is not allowed');
      live.manual = true;
      live.order = { ...live.order, status: next, updatedAt: new Date(now()).toISOString(), readyAt: next === 'ready' ? new Date(now()).toISOString() : live.order.readyAt };
      return live.order;
    },
    async ownerRecordCashPayment(orderId, body) {
      await gate();
      const live = findOrder(world, orderId);
      const paid = live.order.paidPesewas + body.amountPesewas;
      live.order = { ...live.order, paidPesewas: paid, paymentStatus: paid >= live.order.totalPesewas ? 'paid' : 'part_paid' };
      return live.order;
    },
    async ownerListWaiterCalls(venueId) {
      await gate();
      return { items: world.calls.filter((call) => call.venueId === venueId).map(({ venueId: _id, ...call }) => call) };
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
    async ownerListVideoReviews(venueId, state) {
      await gate();
      return {
        items: world.videos
          .filter((video) => video.venueId === venueId && (!state || video.state === state))
          .map(({ venueId: _id, ...video }) => video),
      };
    },
    async ownerModerateVideoReview(id, body) {
      await gate();
      const video = world.videos.find((item) => item.id === id);
      if (!video) throw new ApiError(404, 'order_not_found', 'Video not found');
      if (body.state === 'featured' && !video.featureConsent) throw new ApiError(409, 'no_consent', 'The guest did not allow featuring');
      video.state = body.state;
      return video;
    },
    async ownerGetLoyalty(venueId) {
      await gate();
      const program = world.programs[venueId];
      if (!program) throw new ApiError(404, 'venue_not_found', 'Venue not found');
      return program;
    },
    async ownerSetLoyalty(venueId, body) {
      await gate();
      world.programs[venueId] = body;
      return body;
    },
    async ownerListLoyaltyMembers() {
      await gate();
      return { items: world.members };
    },
    async ownerGetPayoutAccount(venueId) {
      await gate();
      const account = world.payouts[venueId];
      if (!account) throw new ApiError(404, 'venue_not_found', 'No payout account yet');
      return account;
    },
    async ownerSetPayoutAccount(venueId, body) {
      await gate();
      const masked = body.settlement.type === 'bank' ? `**** ${body.settlement.accountNumber.slice(-4)}` : `**** ${body.settlement.phone.slice(-4)}`;
      const account = { businessName: body.businessName, settlementType: body.settlement.type, accountMasked: masked, verified: false, ozaaFeePercent: world.payouts[venueId]?.ozaaFeePercent ?? 0 };
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
  };

  return api;
}

export { decideMockCard };

