import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from './config.ts';

const base = {
  ENCRYPTION_KEY: 'a'.repeat(64),
  DATABASE_URL: 'postgres://localhost/cravins',
  GUEST_TOKEN_SECRET: 's'.repeat(32),
};

test('the database pool defaults to 10 and stays inside a small pooler', () => {
  assert.equal(readConfig(base).DATABASE_POOL_MAX, 10);
  assert.equal(readConfig({ ...base, DATABASE_POOL_MAX: '12' }).DATABASE_POOL_MAX, 12);
  assert.throws(() => readConfig({ ...base, DATABASE_POOL_MAX: '0' }));
  assert.throws(() => readConfig({ ...base, DATABASE_POOL_MAX: '50' }));
});
