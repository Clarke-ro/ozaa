// Builds the mock fixtures (api/fixtures/*.json) from the v5 prototype sample data,
// shaped exactly like the schemas in api/openapi.yaml.
// Run: node api/fixtures/build-fixtures.mjs   (from the kit root)
// The coding agent copies these JSON files into src/mocks/fixtures/ in Phase 0.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import * as prettier from 'prettier';
import { fileURLToPath } from 'node:url';
import { LOYALTY } from './loyalty-data.mjs';

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
const { deriveTheme } = W.CravinsTheme;

// Mock media lives under this fake host. The mock layer maps it to bundled files.
const MEDIA = 'https://mock.cravins.app/media/';
const img = (p, w = 800, h = 600, alt = '') => ({ url: MEDIA + p, width: w, height: h, alt });
// Two close-up crops of each dish photo (img/<dish>-2.jpg, -3.jpg) stand in for extra photos.
const closeUps = (p, alt) =>
  [2, 3].map(n => img(p.replace(/\.jpg$/, `-${n}.jpg`), 800, 800, `${alt}, close up`));
// Which section a sample dish sits in, by name. Others go in the venue's first section.
const SECTION = { 'Kɛlɛwɛlɛ': 'Sides', Sobolo: 'Drinks' };
// Sample diet tags by dish name, so the guest diet filter has something to offer.
const DIET = {
  'Jollof & chicken': ['halal'],
  'Waakye special': ['halal'],
  'Banku & tilapia': ['gluten_free', 'spicy'],
  'Kɛlɛwɛlɛ': ['vegetarian', 'vegan', 'gluten_free', 'spicy'],
  'Sobolo': ['vegetarian', 'vegan', 'gluten_free'],
};
const slugs = { mamas: 'mamas-kitchen', bean: 'bean-there', akos: 'auntie-akos' };
const hoursUntil = { mamas: '22:00', bean: '20:00', akos: '21:00' };
const LANG = { EN: 'en', TWI: 'tw' };
// Sample holiday hours, so the guest app can show "closed today" and "special hours".
const HOLIDAYS = {
  mamas: [
    { date: '2026-12-25', closed: true, name: 'Christmas Day' },
    { date: '2027-01-01', closed: false, name: "New Year's Day", opens: '14:00', closes: '22:00' },
  ],
};
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
    notes: t.notes, cravinsDistance: t.cravinsDistance,
    ratios: { buttonText: t.ratios.buttonText, inkOnWhite: t.ratios.inkOnWhite, badge: t.ratios.badge },
  };
  const day = [{ opens: '09:00', closes: hoursUntil[key] }];
  out.venues[slug] = {
    id: venueId, slug, name: v.name, initials: v.initials,
    description: { en: v.about },
    location: { label: v.place },
    hours: {
      timezone: 'Africa/Accra', weekly: [day, day, day, day, day, day, day],
      ...(HOLIDAYS[key] ? { exceptions: HOLIDAYS[key] } : {}),
    },
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

  // Menu: categories from v.cats. Dishes sit in the first category unless SECTION names another
  // (BUILD.md 5b.6: the guest menu scrolls section by section, so the sample needs more than one).
  const categories = v.cats.map((c, i) => ({ id: `cat_${key}${i}`, name: { en: c }, kind: /drink|coffee/i.test(c) ? 'drinks' : 'food', position: i }));
  const items = v.items.map((it, i) => ({
    id: `itm_${key}${i}`, categoryId: (categories.find(c => c.name.en === SECTION[it.n]) ?? categories[0]).id,
    name: { en: it.n }, description: { en: it.d }, pricePesewas: Math.round(it.p * 100),
    photo: img(it.img, 800, 800, it.n), gallery: closeUps(it.img, it.n), available: true, dietary: DIET[it.n] ?? [], badges: it.pop ? ['popular'] : [],
    modifierGroups: [], prepMinutes: 12,
  }));
  out.menus[slug] = { venueId, updatedAt: now.toISOString(), categories, items };

  out.leaderboards[slug] = {
    period: 'week',
    entries: [['Ama', 41], ['Kojo', 37], ['Efua', 29], ['Yaw', 24], ['Akua', 19]].map(([nickname, score], i) => ({ rank: i + 1, nickname, score, sample: true })),
    stampRule: { enabled: v.game.stampReward, minScore: v.game.stampScore },
  };
  out.loyaltyCards[slug] = LOYALTY[key];
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

// Format with prettier, as the commit hook does, so a rebuild matches the committed files exactly.
for (const [name, data] of Object.entries(out)) {
  const file = path.join(here, name + '.json');
  const options = await prettier.resolveConfig(file);
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(file, await prettier.format(json, { ...options, filepath: file }));
}
console.log('fixtures written:', Object.keys(out).join(', '));
