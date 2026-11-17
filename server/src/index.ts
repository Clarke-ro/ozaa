import { serve } from '@hono/node-server';
import { sql } from 'drizzle-orm';
import { createApp } from './app.ts';
import { readConfig } from './config.ts';
import { connect } from './db/client.ts';
import { paymentStore } from './db/paymentStore.ts';
import { createLog } from './log.ts';
import { paymentService } from './payments.ts';
import { paystackClient } from './paystack.ts';
import { encryptionKey } from './secrets/sealed.ts';
import { venuePaystack } from './venues/venuePaystack.ts';
import { clerkVerifier } from './owner/clerk.ts';
import { clerkAdmin } from './owner/clerkAdmin.ts';
import { arkeselSender } from './sms/arkesel.ts';
import { supabaseStorage } from './media/storage.ts';
import { sentryReport } from './monitor.ts';

const config = readConfig();
const log = createLog();
const report = config.SENTRY_DSN ? sentryReport(config.SENTRY_DSN, config.SENTRY_ENVIRONMENT) : undefined;
// Errors outside a request (a timer, a forgotten promise) are reported too, then logged by name only.
process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error('Unhandled rejection');
  log({ event: 'unhandled_rejection', name: error.name });
  report?.(error);
});
const { db, close } = connect(config.DATABASE_URL);
// Each payment is charged with the Paystack key of the venue whose bill it is.
const venueKeys = venuePaystack({ db, key: encryptionKey(config.ENCRYPTION_KEY), client: (secret) => paystackClient(secret) });
const payments = paymentService({
  paystackFor: (slug) => venueKeys.forVenueSlug(slug),
  store: paymentStore(db),
  siteUrl: config.SITE_URL,
});
const app = createApp({
  guest: { db, guestSecret: config.GUEST_TOKEN_SECRET, now: Date.now, loyaltyKey: encryptionKey(config.ENCRYPTION_KEY) },
  payments,
  otp: {
    db,
    now: Date.now,
    hashSecret: config.GUEST_TOKEN_SECRET,
    loyaltyKey: encryptionKey(config.ENCRYPTION_KEY),
    sms: config.ARKESEL_API_KEY ? arkeselSender({ apiKey: config.ARKESEL_API_KEY, sender: config.ARKESEL_SENDER_ID }) : null,
    dailyLimit: config.SMS_DAILY_LIMIT,
  },
  owner: {
    db,
    // Clerk's tokens name the site that asked for them (azp); only our own sites count.
    verify: config.CLERK_SECRET_KEY
      ? clerkVerifier({ secretKey: config.CLERK_SECRET_KEY, authorizedParties: config.ALLOWED_ORIGINS })
      : null,
    now: Date.now,
    venueKeys,
    paystackClient: (secret) => paystackClient(secret),
    siteUrl: config.SITE_URL,
    clerkAdmin: config.CLERK_SECRET_KEY ? clerkAdmin(config.CLERK_SECRET_KEY) : null,
    storage:
      config.SUPABASE_URL && config.SUPABASE_SECRET_KEY
        ? supabaseStorage({ url: config.SUPABASE_URL, secretKey: config.SUPABASE_SECRET_KEY, bucket: config.MEDIA_BUCKET })
        : null,
  },
  allowedOrigins: config.ALLOWED_ORIGINS,
  log,
  report,
  ping: async () => {
    await db.execute(sql`select 1`);
  },
});

const server = serve({ fetch: app.fetch, port: config.PORT }, ({ port }) => {
  log({ event: 'server_started', port, mode: 'paystack_test' });
});

// Heroku sends SIGTERM on every deploy and daily restart, then waits 30 s before killing the
// process. Stop taking new requests, let the ones in flight finish (a payment mid-way to Paystack),
// then close the database connections.
process.once('SIGTERM', () => {
  log({ event: 'server_stopping' });
  server.close(() => {
    void close().finally(() => process.exit(0));
  });
});
