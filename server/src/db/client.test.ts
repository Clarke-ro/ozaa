import { test } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { drizzleClient } from './client.ts';

// Tests run on PGlite, which turns a Date into a timestamp by itself. Production runs postgres-js,
// where drizzle switches that off, so a Date inside a hand-written sql`` query failed there only
// (Sentry CRAVINS-API-1 and -2). This checks the real driver's setup without opening a connection.
test('a Date in a hand-written query reaches postgres-js as a timestamp string', () => {
  const client = postgres('postgres://nobody@127.0.0.1:1/none', { prepare: false });
  drizzleClient(client);
  const serialize = client.options.serializers[1184]!;
  assert.equal(serialize(new Date('2026-11-22T00:00:00Z')), '2026-11-22T00:00:00.000Z');
  // Drizzle's own queries already send strings; those pass through untouched.
  assert.equal(serialize('2026-11-22 00:00:00+00'), '2026-11-22 00:00:00+00');
});
