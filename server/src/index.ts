import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { readConfig } from './config.ts';
import { connect } from './db/client.ts';
import { paymentStore } from './db/paymentStore.ts';
import { createLog } from './log.ts';
import { paymentService } from './payments.ts';
import { paystackClient } from './paystack.ts';

const config = readConfig();
const log = createLog();
const { db } = connect(config.DATABASE_URL);
const payments = paymentService({
  paystack: paystackClient(config.PAYSTACK_SECRET_KEY),
  store: paymentStore(db),
  siteUrl: config.SITE_URL,
  testMode: true,
});
const app = createApp({
  payments,
  secret: config.PAYSTACK_SECRET_KEY,
  allowedOrigins: config.ALLOWED_ORIGINS,
  log,
});

serve({ fetch: app.fetch, port: config.PORT }, ({ port }) => {
  log({ event: 'server_started', port, mode: 'paystack_test' });
});
