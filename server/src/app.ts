import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { PaymentService } from './payments.ts';
import type { Log } from './log.ts';
import { Problem, problemResponse } from './http/problem.ts';
import { guestRoutes, type GuestDeps } from './routes/guest.ts';
import { guestExtraRoutes } from './routes/guestExtras.ts';
import { ownerFeedbackRoutes } from './routes/ownerFeedback.ts';
import { ownerRoutes, type OwnerRouteDeps } from './routes/owner.ts';
import { mediaRoutes } from './routes/media.ts';
import { ownerDeskRoutes } from './routes/ownerDesk.ts';
import { ownerMenuRoutes } from './routes/ownerMenu.ts';
import { ownerStaffRoutes } from './routes/ownerStaff.ts';
import { ownerTablesRoutes } from './routes/ownerTables.ts';
import { ownerVenueRoutes } from './routes/ownerVenue.ts';
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
  /** Throws when the database doesn't answer. Used by the health check. */
  ping: () => Promise<void>;
}) {
  const app = new Hono().basePath('/v1');
  // Any Problem thrown in a route becomes the contract's error shape; anything else is logged
  // without its details (they can hold personal data) and answered with a plain 500.
  app.onError((error, c) => {
    if (error instanceof Problem) return problemResponse(c, error);
    deps.log({ event: 'server_error', name: error.name });
    return c.json(
      { type: 'https://cravins.app/problems/server_error', title: 'Something went wrong.', status: 500, code: 'server_error' },
      500,
      { 'Content-Type': 'application/problem+json' },
    );
  });
  app.use(
    '*',
    cors({
      origin: deps.allowedOrigins,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
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

  if (deps.guest) {
    app.route('/', guestRoutes(deps.guest));
    app.route('/', guestExtraRoutes(deps.guest));
    app.route('/', paymentRoutes({ ...deps.guest, payments: deps.payments, log: deps.log }));
  }
  if (deps.otp) app.route('/', otpRoutes({ ...deps.otp, log: deps.log }));
  if (deps.owner) app.route('/', ownerRoutes({ ...deps.owner, log: deps.log }));
  if (deps.owner) app.route('/', ownerMenuRoutes(deps.owner));
  if (deps.owner) app.route('/', mediaRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerTablesRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerDeskRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerStaffRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerFeedbackRoutes(deps.owner));
  if (deps.owner) app.route('/', ownerVenueRoutes(deps.owner));
  if (deps.guest && deps.owner) app.route('/', waiterRoutes({ ...deps.guest, ...deps.owner }));

  return app;
}
