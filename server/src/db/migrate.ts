import { readConfig } from '../config.ts';
import { createLog } from '../log.ts';
import { migrateDb } from './client.ts';

// `npm run db:migrate`: brings the database in DATABASE_URL up to the newest migration in
// drizzle/. Run it before starting a new version of the server, never from the server itself,
// so two copies starting at once can't both try to change the tables.
const log = createLog();
await migrateDb(readConfig().DATABASE_URL);
log({ event: 'migrated' });
