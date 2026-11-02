// Builds the mock fixtures (api/fixtures/*.json) from the v5 prototype sample data,
// shaped exactly like the schemas in api/openapi.yaml.
// Run: node api/fixtures/build-fixtures.mjs   (from the kit root)
// The coding agent copies these JSON files into src/mocks/fixtures/ in Phase 0.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const proto = path.join(here, '../../design/prototype');

// Load the prototype's browser scripts into a fake `window`.
const sandbox = { window: {} };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
for (const f of ['theme.js', 'venues.js', 'data.js']) {
  vm.runInContext(fs.readFileSync(path.join(proto, f), 'utf8'), sandbox, { filename: f });
}
const W = sandbox.window;
const { deriveTheme } = W.OzaaTheme;

// Mock media lives under this fake host. The mock layer maps it to bundled files.
const MEDIA = 'https://mock.ozaa.app/media/';
const img = (p, w = 800, h = 600, alt = '') => ({ url: MEDIA + p, width: w, height: h, alt });
// Two close-up crops of each dish photo (img/<dish>-2.jpg, -3.jpg) stand in for extra photos.
const closeUps = (p, alt) =>
  [2, 3].map(n => img(p.replace(/\.jpg$/, `-${n}.jpg`), 800, 800, `${alt}, close up`));
const slugs = { mamas: 'mamas-kitchen', bean: 'bean-there', akos: 'auntie-akos' };
const hoursUntil = { mamas: '22:00', bean: '20:00', akos: '21:00' };
const LANG = { EN: 'en', TWI: 'tw' };
const now = new Date('2026-10-31T12:41:00Z');
const daysAgo = s => {
  const n = /Yesterday/.test(s) ? 1 : /(\d+) days?/.test(s) ? +RegExp.$1 : /(\d+) weeks?/.test(s) ? 7 * RegExp.$1 : 0;
  return new Date(now.getTime() - n * 864e5).toISOString();
};

const out = { venues: {}, menus: {}, leaderboards: {}, loyaltyCards: {}, wifi: {}, offers: {}, orders: {} };

for (const [key, v] of Object.entries(W.VENUES)) {
  const slug = slugs[key];
  const venueId = 'ven_' + key;
  const t = deriveTheme(v.accent);
  const derived = {
    fill: t.fill, onAccent: t.onAccent, pressed: t.pressed, ink: t.ink, tint: t.tint, badgeInk: t.badgeInk,
    notes: t.notes, ozaaDistance: t.ozaaDistance,
    ratios: { buttonText: t.ratios.buttonText, inkOnWhite: t.ratios.inkOnWhite, badge: t.ratios.badge },
  };
  const day = [{ opens: '09:00', closes: hoursUntil[key] }];
  out.venues[slug] = {
    id: venueId, slug, name: v.name, initials: v.initials,
    description: { en: v.about },
    location: { label: v.place },
    hours: { timezone: 'Africa/Accra', weekly: [day, day, day, day, day, day, day] },
    theme: { accent: v.accent, fontPair: v.font, derived },
    banner: img(v.banner.replace(/^img\//, 'img/'), 1170, 720, v.name),
    logo: null,
    services: v.services.map(id => ({ id, section: W.SERVICES[id].sec, enabled: true, ...(id === 'offers' && v.offerNote ? { subtitle: v.offerNote } : {}) })),
    game: { enabled: v.game.stampReward, minScore: v.game.stampScore },
    loyaltySummary: { stampsNeeded: v.loyalty.need, rewardTitle: v.loyalty.reward },
    currency: 'GHS',
    languages: [...new Set(['en', LANG[v.lang] || 'en'])],
    googleReviewUrl: 'https://g.page/r/sample-' + key + '/review',
    payEnabled: true,
  };
  out.wifi[slug] = { ssid: v.wifi.ssid, password: v.wifi.pass, security: v.wifi.sec };

  // Menu: categories from v.cats; prototype items all sit in the first category.
  const categories = v.cats.map((c, i) => ({ id: `cat_${key}${i}`, name: { en: c }, kind: /drink|coffee/i.test(c) ? 'drinks' : 'food', position: i }));
  const items = v.items.map((it, i) => ({
    id: `itm_${key}${i}`, categoryId: categories[0].id,
    name: { en: it.n }, description: { en: it.d }, pricePesewas: Math.round(it.p * 100),
    photo: img(it.img, 800, 800, it.n), gallery: closeUps(it.img, it.n), available: true, dietary: [], badges: it.pop ? ['popular'] : [],
    modifierGroups: [], prepMinutes: 12,
  }));
  out.menus[slug] = { venueId, updatedAt: now.toISOString(), categories, items };

  out.leaderboards[slug] = {
    period: 'week',
    entries: [['Ama', 41], ['Kojo', 37], ['Efua', 29], ['Yaw', 24], ['Akua', 19]].map(([nickname, score], i) => ({ rank: i + 1, nickname, score, sample: true })),
    stampRule: { enabled: v.game.stampReward, minScore: v.game.stampScore },
  };
  out.loyaltyCards[slug] = {
    venueId, stamps: v.loyalty.have, stampsNeeded: v.loyalty.need,
    reward: { id: `rwd_${key}`, title: v.loyalty.reward, stampsNeeded: v.loyalty.need },
    rewardReady: v.loyalty.have >= v.loyalty.need, memberSince: '2026-03-14', history: [],
    consent: { marketing: false, at: '2026-03-14T18:02:00Z' },
  };
  out.offers[slug] = { items: v.offerNote ? [
    { id: `ofr_${key}1`, title: { en: 'Jollof Tuesday' }, detail: { en: 'Second plate half price' }, menuItemId: items[0].id, endsAt: null },
    { id: `ofr_${key}2`, title: { en: 'Happy hour drinks' }, detail: { en: 'Sobolo GH₵10 from 4 to 6 PM' }, endsAt: null },
  ] : [] };

  // Sample open order for this table (prototype ORDER: #24, step 1 = being prepared).
  const lines = W.ORDER.items.map((o, i) => {
    const it = items[o.i % items.length];
    return { id: `oln_${key}${i}`, menuItemId: it.id, name: it.name.en, quantity: o.q, modifiers: [],
      unitPricePesewas: it.pricePesewas, totalPesewas: it.pricePesewas * o.q, paid: false };
  });
  const subtotal = lines.reduce((s, l) => s + l.totalPesewas, 0);
  out.orders[slug] = {
    id: `ord_${key}24`, number: W.ORDER.no, venueId, tableCode: v.table, status: 'preparing', paymentStatus: 'unpaid',
    lines, subtotalPesewas: subtotal, taxes: [], totalPesewas: subtotal, paidPesewas: 0, etaMinutes: W.ORDER.eta,
    createdAt: '2026-10-31T12:41:00Z', updatedAt: '2026-10-31T12:44:00Z', readyAt: null,
  };
}

for (const [name, data] of Object.entries(out)) {
  fs.writeFileSync(path.join(here, name + '.json'), JSON.stringify(data, null, 2) + '\n');
}
console.log('fixtures written:', Object.keys(out).join(', '));
