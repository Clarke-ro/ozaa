import { setupOf } from './worldLookups';
import { DEMO_CODE } from './demo';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { rememberOpenOrder } from './openOrder';
import { nextId, publicVenue, STAFF, venueBySlug } from './world';
import { accessOf } from './mockRules';
import type { MockContext } from './mockContext';
import type { World } from './worldTypes';
import type { StaffPrefs, StaffUser } from '@/lib/api/types';
import { mockUploadedImage } from './mediaRegistry';
import { tableLink } from '@/lib/tableLink';
import { env } from '@/lib/env';

const DEFAULT_PREFS: StaffPrefs = {
  language: 'en',
  appearance: 'system',
  soundForNewOrders: true,
  notify: { order: true, call: true, bill: true, guest_note: true, review: true },
};

/** The profile extras for a staff member, with defaults until they change something. */
export function profileOf(world: World, phone: string) {
  const staff = STAFF.find((person) => person.phone === phone);
  return (
    world.profiles.get(phone) ?? {
      firstName: staff?.firstName ?? 'Owner',
      lastName: null,
      email: null,
      photo: null,
      phone,
      prefs: DEFAULT_PREFS,
    }
  );
}

/** Mock calls: the loyalty code, the signed-in profile and the guest session. */
export function mockAuthCalls(ctx: MockContext) {
  const { world, tokens, now, gate } = ctx;
  const meOf = (phone: string): StaffUser => {
    const profile = profileOf(world, phone);
    return {
      id: `usr_${phone.slice(-4)}`,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      email: profile.email,
      photo: profile.photo,
      prefs: profile.prefs,
      venues: STAFF.filter((person) => person.phone === phone).flatMap((person) => {
        const venue = world.venues[person.slug];
        return venue ? [{ venueId: venue.id, name: venue.name, role: person.role }] : [];
      }),
    };
  };
  // Loyalty only: owners and staff sign in through mockOwnerAuth, the stand-in for Clerk.
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
    world.access.set(accessToken, { phone: body.phone, purpose: body.purpose });
    return { accessToken, expiresAt: new Date(now() + 3600_000).toISOString() };
  };

  return {
    verifyOtp,
    async requestOtp() {
      await gate();
      return { expiresInSeconds: 300, resendInSeconds: 30 };
    },
    async getMe() {
      await gate();
      const row = accessOf(world, tokens);
      const me = meOf(row.phone);
      // Signed in, but on no team: the server answers the same way (api/openapi.yaml, getMe).
      if (me.venues.length === 0)
        throw new ApiError(403, 'not_staff', 'This number is not on a Cravins team');
      return me;
    },
    async updateMyProfile(body) {
      await gate();
      const { phone } = accessOf(world, tokens);
      const current = profileOf(world, phone);
      if (body.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email))
        throw new ApiError(422, 'email_not_valid', 'Check the email address');
      world.profiles.set(phone, {
        ...current,
        firstName: body.firstName?.trim() || current.firstName,
        lastName: body.lastName === undefined ? current.lastName : body.lastName,
        email: body.email === undefined ? current.email : body.email,
        photo:
          body.photoMediaId === undefined
            ? current.photo
            : body.photoMediaId === null
              ? null
              : (mockUploadedImage(body.photoMediaId) ?? current.photo),
        prefs: body.prefs ?? current.prefs,
      });
      return meOf(phone);
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
              qrUrl: tableLink(env.EXPO_PUBLIC_SITE_URL, venue.slug, tableCode),
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
          setupOf(world, venue),
        ),
        table,
      };
    },
    async deleteAccount() {
      await gate();
    },
  } satisfies Partial<ApiClient>;
}
