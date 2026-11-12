import { DEMO_CODE } from './demo';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { rememberOpenOrder } from './openOrder';
import { nextId, publicVenue, STAFF, venueBySlug } from './world';
import { accessOf } from './mockRules';
import type { MockContext } from './mockContext';

/** Mock calls: sign-in, tokens and the guest session. */
export function mockAuthCalls(ctx: MockContext) {
  const { world, tokens, now, gate } = ctx;
  const verifyOtp: ApiClient['verifyOtp'] = async (body) => {
    await gate();
    const fails = world.otpFails.get(body.phone) ?? 0;
    if (fails >= 3) throw new ApiError(429, 'rate_limited', 'Too many tries');
    if (body.code !== DEMO_CODE) {
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
  };

  return {
    verifyOtp,
    async requestOtp(body) {
      await gate();
      return { expiresInSeconds: 300, resendInSeconds: 30 };
    },
    async refreshTokens(body) {
      await gate();
      const previous = world.refresh.get(body.refreshToken);
      if (!previous) throw new ApiError(401, 'unauthorized', 'Sign in again');
      const row = world.access.get(previous);
      if (!row) throw new ApiError(401, 'unauthorized', 'Sign in again');
      world.refresh.delete(body.refreshToken);
      return verifyOtp({ phone: row.phone, code: DEMO_CODE, purpose: row.purpose });
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
      world.sessions.set(token, {
        slug: venue.slug,
        tableCode,
        orderId,
        startedAt: new Date(now()).toISOString(),
      });
      rememberOpenOrder(token, orderId);
      const table =
        world.tables[venue.id]?.find((item) => item.code === tableCode) ??
        (tableCode
          ? {
              id: `tbl_${tableCode}`,
              code: tableCode,
              label: `Table ${tableCode}`,
              qrUrl: `https://cravins.app/${venue.slug}/t/${tableCode}`,
            }
          : undefined);
      return {
        guestToken: token,
        expiresAt: new Date(now() + 12 * 3600_000).toISOString(),
        venue: publicVenue(
          venue,
          world.notices[venue.slug],
          now(),
          world.paymentSettings[venue.id],
        ),
        table,
      };
    },
    async deleteAccount() {
      await gate();
    },
  } satisfies Partial<ApiClient>;
}
