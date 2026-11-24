// Copies the app's pure money and menu rules into server/src/shared/, so the server prices orders
// with exactly the same code as the app shows (no second copy to drift). Generated: run
// `npm run sync:server-shared` after changing any file below; CI fails if the copies are stale.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'server/src/shared');
const FILES = {
  'src/lib/brand.ts': 'brand.ts',
  'src/lib/money.ts': 'money.ts',
  'src/lib/dishRules.ts': 'dishRules.ts',
  'src/lib/promos.ts': 'promos.ts',
  'src/lib/tax.ts': 'tax.ts',
  'src/lib/geo.ts': 'geo.ts',
  'src/lib/onlineOrdering.ts': 'onlineOrdering.ts',
  'src/lib/paystackFee.ts': 'paystackFee.ts',
  'src/lib/payments.ts': 'payments.ts',
  'src/lib/notices.ts': 'notices.ts',
  'src/features/pay/quoteBill.ts': 'quoteBill.ts',
  'src/features/orders/orderMachine.ts': 'orderMachine.ts',
  'src/features/waiter/waiterCallMachine.ts': 'waiterCallMachine.ts',
  'src/features/waiter/callUpdate.ts': 'callUpdate.ts',
  'src/lib/tableLink.ts': 'tableLink.ts',
  'src/lib/qrSvg.ts': 'qrSvg.ts',
  'src/features/theming/colour.ts': 'colour.ts',
  'src/features/theming/deriveTheme.ts': 'deriveTheme.ts',
  'src/features/owner/desk/daySummary.ts': 'daySummary.ts',
  'src/features/owner/floor/floorStatus.ts': 'floorStatus.ts',
  'src/lib/sales.ts': 'sales.ts',
  'src/lib/feedbackSummary.ts': 'feedbackSummary.ts',
  'src/features/loyalty/factsTypes.ts': 'factsTypes.ts',
  'src/features/loyalty/factsFold.ts': 'factsFold.ts',
  'src/features/loyalty/factsParse.ts': 'factsParse.ts',
  'src/features/loyalty/factsHistory.ts': 'factsHistory.ts',
  'src/features/loyalty/factsWire.ts': 'factsWire.ts',
  'src/features/loyalty/facts.ts': 'loyaltyFacts.ts',
  'src/features/loyalty/customers.ts': 'loyaltyCustomers.ts',
  'src/lib/notificationFeed.ts': 'notificationFeed.ts',
  'src/lib/insights.ts': 'insights.ts',
  'src/lib/guestServices.ts': 'guestServices.ts',
  'src/lib/channels.ts': 'channels.ts',
  'src/lib/api/types.ts': 'types.ts',
  'src/lib/api/schema.ts': 'schema.ts',
};
const NAMES = new Map(Object.entries(FILES).map(([from, to]) => [from.replace(/\.ts$/, ''), to]));

// '@/lib/brand' → './brand.ts', './schema' → './schema.ts' (the server's imports name the file).
function rewrite(code, fromFile) {
  return code.replace(/from '([^']+)'/g, (whole, spec) => {
    let key = null;
    if (spec.startsWith('@/')) key = `src/${spec.slice(2)}`;
    else if (spec.startsWith('.')) key = path.posix.join(path.posix.dirname(fromFile), spec);
    if (key === null) return whole;
    const target = NAMES.get(key);
    if (!target) throw new Error(`${fromFile} imports ${spec}, which isn't shared with the server`);
    return `from './${target}'`;
  });
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const [from, to] of Object.entries(FILES)) {
  const code = fs.readFileSync(path.join(root, from), 'utf8');
  const head = `// Generated from ${from} by scripts/sync-server-shared.mjs. Do not edit here.\n`;
  fs.writeFileSync(path.join(out, to), head + rewrite(code, from));
}
console.log(`server/src/shared: ${Object.keys(FILES).length} files`);

// The sample venues, for `npm run db:seed` on the server (Heroku gets server/ only).
const seed = path.join(root, 'server/seed');
fs.rmSync(seed, { recursive: true, force: true });
fs.mkdirSync(seed, { recursive: true });
for (const name of ['venues', 'menus', 'offers', 'wifi', 'loyaltyCards']) {
  fs.copyFileSync(path.join(root, `api/fixtures/${name}.json`), path.join(seed, `${name}.json`));
}
console.log('server/seed: sample venues copied');
