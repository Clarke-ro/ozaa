import { test } from 'node:test';
import assert from 'node:assert/strict';
import { menuItems, venues } from './schema.ts';
import { seedSamples } from './seedSamples.ts';
import { testDb } from './testDb.ts';

test('the real server points sample photos at the real app, never the demo-only address', async () => {
  const db = await testDb();
  await seedSamples(db, { siteUrl: 'https://cravins-app.vercel.app/' });
  const text = JSON.stringify([await db.select().from(venues), await db.select().from(menuItems)]);
  assert.ok(!text.includes('mock.cravins.app'));
  assert.ok(text.includes('https://cravins-app.vercel.app/sample/img/'));
});
