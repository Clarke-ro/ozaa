import { inArray } from 'drizzle-orm';
import { readConfig } from '../config.ts';
import { createLog } from '../log.ts';
import { encryptionKey } from '../secrets/sealed.ts';
import { venuePaystack } from '../venues/venuePaystack.ts';
import { connect } from './client.ts';
import { paymentSettings } from './schema.ts';
import { seedSamples } from './seedSamples.ts';

// `npm run db:seed`: puts the sample venues into the database. Heroku runs it after each migrate,
// but it only does something while SEED_SAMPLES=true (the sandbox stage). Rows that already exist
// are left alone, so owner changes to a sample venue survive a deploy.
//
// With PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY (test keys) set too, sample venues that have no
// Paystack yet are connected to that test account, so a test payment works before any owner signs
// in. A venue an owner connected keeps its own keys.
const log = createLog();
if (process.env.SEED_SAMPLES !== 'true') {
  log({ event: 'seed_skipped' });
} else {
  const config = readConfig();
  const { db, close } = connect(config.DATABASE_URL);
  try {
    const { venueIds, items } = await seedSamples(db);
    log({ event: 'seeded', venues: venueIds.length, items });
    if (config.PAYSTACK_SECRET_KEY && config.PAYSTACK_PUBLIC_KEY) {
      const keys = venuePaystack({ db, key: encryptionKey(config.ENCRYPTION_KEY), client: () => { throw new Error('not used'); } });
      const rows = await db.select().from(paymentSettings).where(inArray(paymentSettings.venueId, venueIds));
      let connected = 0;
      for (const row of rows.filter((r) => !r.paystackSecretEncrypted)) {
        await keys.save(row.venueId, { mode: 'test', publicKey: config.PAYSTACK_PUBLIC_KEY, secretKey: config.PAYSTACK_SECRET_KEY }, Date.now());
        connected += 1;
      }
      log({ event: 'sample_paystack_connected', venues: connected });
    }
  } finally {
    await close();
  }
}
