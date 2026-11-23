import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { readGuestToken } from './guest/token.ts';
import { isTimeout } from './http/outbound.ts';
import {
  clientIp,
  GUEST_IP_WRITES_PER_MIN,
  GUEST_NEW_VISITS_PER_MIN,
  GUEST_SESSION_WRITES_PER_MIN,
  slidingWindow,
} from './http/rateLimit.ts';
import type { PaymentService } from './payments.ts';
import type { Log } from './log.ts';
import { Problem, problemResponse } from './http/problem.ts';
import { guestRoutes, type GuestDeps } from './routes/guest.ts';
import { guestExtraRoutes } from './routes/guestExtras.ts';
import { ownerFeedbackRoutes } from './routes/ownerFeedback.ts';
import { ownerRoutes, type OwnerRouteDeps } from './routes/owner.ts';
import { staffPinRoutes } from './routes/staffPin.ts';
import { mediaRoutes } from './routes/media.ts';
import { dashboardMemo, ownerDeskRoutes } from './routes/ownerDesk.ts';
import { ownerLoyaltyRoutes } from './routes/ownerLoyalty.ts';
import { ownerLinkRoutes } from './routes/ownerLinks.ts';
import { ownerMenuRoutes } from './routes/ownerMenu.ts';
import { ownerBusinessRoutes } from './routes/ownerBusiness.ts';
import { meRoutes } from './routes/me.ts';
import { ownerOrderEntryRoutes } from './routes/ownerOrderEntry.ts';
import { ownerNotificationRoutes } from './routes/ownerNotifications.ts';
import { ownerPromoRoutes } from './routes/ownerPromos.ts';
import { ownerStaffRoutes } from './routes/ownerStaff.ts';
import { ownerTablesRoutes } from './routes/ownerTables.ts';
import { ownerVenueRoutes } from './routes/ownerVenue.ts';
import { loyaltyRoutes } from './routes/loyalty.ts';
import { otpRoutes, type OtpDeps } from './routes/otp.ts';
import { paymentRoutes } from './routes/payments.ts';
import { waiterRoutes } from './routes/waiter.ts';

export function createApp(deps: {
  /** Guest calls (sessions, venues, menu, orders, bill, payments). Missing in the health-only tests. */
  guest?: GuestDeps;
  payments: PaymentService;
  /** Owner and staff calls. Missing in the tests that don't sign anyone in. */
  owner?: Omit<OwnerRouteDeps, 'log'>;
  /** Guest phone codes for loyalty. Missing in tests that don't use them. */
  otp?: Omit<OtpDeps, 'log'>;
  allowedOrigins: string[];
  log: Log;
  /**
   * Guest write caps. Defaults suit a busy venue on one shared Wi-Fi address. Tests pass small
   * numbers so they can prove the cap without hundreds of requests.
   */
  guestLimits?: {
    newVisitsPerMinute?: number;
    sessionWritesPerMinute?: number;
    ipWritesPerMinute?: number;
  };
  /** Throws when the database doesn't answer. Used by the health check. */
  ping: () => Promise<void>;
  /** Sends unexpected errors to monitoring (Sentry). Missing in tests and without a DSN. */
  report?: (error: Error) => void;
}) {
  const app = new Hono().basePath('/v1');
  // Any Problem thrown in a route becomes the contract's error shape; anything else is logged
  // without its details (they can hold personal data) and answered with a plain 500.
  app.onError((error, c) => {
    if (error instanceof Problem) return problemResponse(c, error);
    if (isTimeout(error)) {
      deps.log({ event: 'upstream_timeout', name: error.name });
      return c.json(
        {
          type: 'https://cravins.app/problems/upstream_timeout',
          title: 'A service took too long. Try again.',
          status: 503,
          code: 'upstream_timeout',
        },
        503,
        { 'Content-Type': 'application/problem+json' },
      );
    }
    deps.log({ event: 'server_error', name: error.name });
    deps.report?.(error);
    return c.json(
      {
        type: 'https://cravins.app/problems/server_error',
        title: 'Something went wrong.',
        status: 500,
        code: 'server_error',
      },
      500,
      { 'Content-Type': 'application/problem+json' },
    );
  });
  // Answers are JSON for our own apps: no framing, no sniffing, no referrer, HTTPS remembered.
  // Cross-origin reads stay allowed (CORS below decides who), so CORP is left off.
  app.use(
    '*',
    secureHeaders({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }),
  );
  // Staff polls used to send hundreds of kilobytes of JSON every few seconds. Gzip shrinks that
  // when the phone asks for it. Clients that don't send Accept-Encoding still get plain JSON.
  app.use('*', compress());
  // Heroku ends HTTPS at its router and says how the request came in. A plain-HTTP call would
  // have sent its token in the clear, so it is refused rather than answered.
  app.use('*', async (c, next) => {
    if (c.req.header('x-forwarded-proto') === 'http') {
      throw new Problem(400, 'https_required', 'Use https.');
    }
    await next();
  });
  // The biggest real request (a venue's settings) is a few KB; nothing needs more than this.
  app.use(
    '*',
    bodyLimit({
      maxSize: 256 * 1024,
      onError: () => {
        throw new Problem(413, 'too_large', 'That request is too big.');
      },
    }),
  );
  // Guests need no sign-in. Many phones share one public address (a venue's Wi-Fi, or a mobile
  // network), so a visit is counted on that phone's session, and the address is only a high
  // backstop. Starting a visit has no session yet, so that one stays per address, at a level a
  // whole dining room can pass. Staff calls need a Clerk sign-in, Paystack's webhook is checked
  // by signature, and phone codes have their own limits, so those are left out.
  const now = deps.guest?.now ?? Date.now;
  const limits = deps.guestLimits ?? {};
  const sessionWrites = slidingWindow({
    limit: limits.sessionWritesPerMinute ?? GUEST_SESSION_WRITES_PER_MIN,
    windowMs: 60_000,
    now,
  });
  const guestWrites = slidingWindow({
    limit: limits.ipWritesPerMinute ?? GUEST_IP_WRITES_PER_MIN,
    windowMs: 60_000,
    now,
  });
  const newVisits = slidingWindow({
    limit: limits.newVisitsPerMinute ?? GUEST_NEW_VISITS_PER_MIN,
    windowMs: 60_000,
    now,
  });
  const limited = (path: string): never => {
    deps.log({ event: 'rate_limited', path });
    throw new Problem(429, 'rate_limited', 'Too many requests. Wait a minute and try again.');
  };
  app.use('*', async (c, next) => {
    const path = c.req.path;
    const write = c.req.method !== 'GET' && c.req.method !== 'OPTIONS';
    const exempt =
      path.startsWith('/v1/owner') ||
      path.startsWith('/v1/webhooks') ||
      path.startsWith('/v1/auth/otp');
    if (write && !exempt) {
      const ip = clientIp(c.req.header('x-forwarded-for'));
      if (path === '/v1/guest-sessions') {
        if (!newVisits.hit(ip)) limited(path);
      } else {
        const header = c.req.header('Authorization');
        const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
        const sessionId = deps.guest
          ? readGuestToken(deps.guest.guestSecret, token, now())?.sid
          : null;
        if (sessionId && !sessionWrites.hit(sessionId)) limited(path);
        if (!guestWrites.hit(ip)) limited(path);
      }
    }
    await next();
  });
  app.use(
    '*',
    cors({
      origin: deps.allowedOrigins,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Loyalty-Token'],
    }),
  );

  // Heroku and uptime checks call this. It says only whether the database answers: never the
  // error itself, which can hold the database address.
  app.get('/health', async (c) => {
    try {
      await deps.ping();
      return c.json({ status: 'ok' });
    } catch {
      deps.log({ event: 'health_database_unreachable' });
      return c.json({ status: 'database_unreachable' }, 503);
    }
  });

  // A staff change (an answered call, an accepted order, a payment) clears the shared home page,
  // so the sidebar badges move as soon as someone acts instead of a few seconds later.
  const dashboardCache = deps.owner ? dashboardMemo(deps.owner.now) : null;
  if (dashboardCache) {
    app.use('/owner/*', async (c, next) => {
      await next();
      if (c.req.method !== 'GET' && c.res.status < 400) dashboardCache.clear();
    });
  }

  if (deps.guest) {
    app.route('/', guestRoutes(deps.guest));
    app.route('/', guestExtraRoutes(deps.guest));
    if (deps.guest.loyaltyKey)
      app.route('/', loyaltyRoutes({ ...deps.guest, loyaltyKey: deps.guest.loyaltyKey }));
    app.route('/', paymentRoutes({ ...deps.guest, payments: deps.payments, log: deps.log }));
  }
  if (deps.otp) app.route('/', otpRoutes({ ...deps.otp, log: deps.log }));
  if (deps.owner) app.route('/', ownerRoutes({ ...deps.owner, log: deps.log }));
  if (deps.owner) app.route('/', ownerMenuRoutes(deps.owner));
  if (deps.owner) app.route('/', mediaRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerTablesRoutes(deps.owner));
  if (deps.owner)
    app.route('/', ownerDeskRoutes({ ...deps.owner, dashboardCache: dashboardCache ?? undefined }));
  if (deps.owner) app.route('/', ownerStaffRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerFeedbackRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerLoyaltyRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerPromoRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerNotificationRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerLinkRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerOrderEntryRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerBusinessRoutes(deps.owner));
  if (deps.owner) app.route('/', meRoutes(deps.owner));
  if (deps.owner) app.route('/', staffPinRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerVenueRoutes(deps.owner));
  if (deps.guest && deps.owner) app.route('/', waiterRoutes({ ...deps.guest, ...deps.owner }));

  return app;
}
