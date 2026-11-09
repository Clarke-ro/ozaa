import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { readConfig } from './config.ts';
import { paymentService } from './payments.ts';
import { paystackClient } from './paystack.ts';

const config = readConfig();
const payments = paymentService({
  paystack: paystackClient(config.PAYSTACK_SECRET_KEY),
  siteUrl: config.SITE_URL,
  testMode: true,
});
const app = createApp({
  payments,
  secret: config.PAYSTACK_SECRET_KEY,
  allowedOrigins: config.ALLOWED_ORIGINS,
  // One JSON line per event: easy to read now, easy to ship to a log service later.
  log: (entry) => console.log(JSON.stringify({ at: new Date().toISOString(), ...entry })),
});

serve({ fetch: app.fetch, port: config.PORT }, ({ port }) => {
  console.log(`Cravins payments sandbox on http://localhost:${port}/v1 (Paystack test mode)`);
});
