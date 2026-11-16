import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptionKey, openSecret, sealSecret, secretHint } from './sealed.ts';

const KEY = encryptionKey('a'.repeat(64));

test('a sealed secret opens again with the same key, and never contains the secret', () => {
  const sealed = sealSecret(KEY, 'sk_test_abcdefghij1234');
  assert.match(sealed, /^v1\./);
  assert.ok(!sealed.includes('sk_test'));
  assert.equal(openSecret(KEY, sealed), 'sk_test_abcdefghij1234');
  // A fresh random IV each time: the same key sealed twice looks different.
  assert.notEqual(sealSecret(KEY, 'sk_test_abcdefghij1234'), sealed);
});

test('a changed letter or the wrong key is refused, not decrypted into nonsense', () => {
  const sealed = sealSecret(KEY, 'sk_test_abcdefghij1234');
  const parts = sealed.split('.');
  parts[3] = Buffer.from('tampered!').toString('base64url');
  assert.throws(() => openSecret(KEY, parts.join('.')));
  assert.throws(() => openSecret(encryptionKey('b'.repeat(64)), sealed));
  assert.throws(() => openSecret(KEY, 'not-sealed'));
});

test('the encryption key must be 32 bytes written as 64 hex characters', () => {
  assert.throws(() => encryptionKey('abc'));
  assert.throws(() => encryptionKey('z'.repeat(64)));
});

test('the hint shows only the last 4 characters', () => {
  assert.equal(secretHint('sk_test_abcdefghij1234'), '••••1234');
});
