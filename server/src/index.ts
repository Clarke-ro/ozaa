import { serve } from '@hono/node-server';
import { sql } from 'drizzle-orm';
import { createApp } from './app.ts';
import { readConfig } from './config.ts';
import { connect } from './db/client.ts';
import { paymentStore } from './db/paymentStore.ts';
import { createLog } from './log.ts';
import { paymentService } from './payments.ts';
import { paystackClient } from './paystack.ts';

const config = readConfig();
const log = createLog();
const { db, close } = connect(config.DATABASE_URL);
const payments = paymentService({
  paystack: paystackClient(config.PAYSTACK_SECRET_KEY),
  store: paymentStore(db),
  siteUrl: config.SITE_URL,
  testMode: true,
});
const app = createApp({
  guest: { db, guestSecret: config.GUEST_TOKEN_SECRET, now: Date.now },
  payments,
  secret: config.PAYSTACK_SECRET_KEY,
  allowedOrigins: config.ALLOWED_ORIGINS,
  log,
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
