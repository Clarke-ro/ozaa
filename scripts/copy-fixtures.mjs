import { cpSync, mkdirSync, readdirSync } from 'node:fs';

const from = new URL('../api/fixtures/', import.meta.url);
const to = new URL('../src/mocks/fixtures/', import.meta.url);
mkdirSync(to, { recursive: true });
for (const name of readdirSync(from)) {
  if (!name.endsWith('.json')) continue;
  cpSync(new URL(name, from), new URL(name, to));
}
