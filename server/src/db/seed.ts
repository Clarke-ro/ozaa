import { readDatabaseUrl } from '../config.ts';
import { createLog } from '../log.ts';
import { connect } from './client.ts';
import { seedSamples } from './seedSamples.ts';

// `npm run db:seed`: puts the sample venues into the database. Heroku runs it after each migrate,
// but it only does something while SEED_SAMPLES=true (the sandbox stage). Rows that already exist
// are left alone, so owner changes to a sample venue survive a deploy.
const log = createLog();
if (process.env.SEED_SAMPLES !== 'true') {
  log({ event: 'seed_skipped' });
} else {
  const { db, close } = connect(readDatabaseUrl());
  try {
    log({ event: 'seeded', ...(await seedSamples(db)) });
  } finally {
    await close();
  }
}
