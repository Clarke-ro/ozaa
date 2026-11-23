import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { operationIds } from './contract.ts';

// BUILD.md 5.2: every operation in the contract has a test that checks a real answer against it.
// Each test file runs in its own process, so this reads the tests themselves: an operation is
// covered when some test calls expectContract('<operationId>', …).
const SRC = fileURLToPath(new URL('..', import.meta.url));

function testFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(path);
    return entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

test('every operation in the contract has a contract check in some test', () => {
  const checked = new Set<string>();
  for (const file of testFiles(SRC)) {
    for (const match of readFileSync(file, 'utf8').matchAll(/expectContract\(\s*'(\w+)'/g)) {
      checked.add(match[1]!);
    }
  }
  const missing = operationIds().filter((id) => !checked.has(id));
  assert.deepEqual(missing, [], 'add an expectContract check for each, in the test that calls it');
});
