import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectContract } from '../contract/contract.ts';
import { as, KITCHEN, OWNER, ownerSetup, WAITER } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);

test('the venue: staff read it; owners edit the profile, Wi-Fi and tax; guests see the public parts', async () => {
  const { call, mamas } = await ownerSetup();
  const path = `/owner/venues/${mamas}`;
  const read = await call('GET', path, undefined, as('user_kitchen', KITCHEN));
  expectContract('ownerGetVenue', 200, read.json);
  assert.ok(read.json.services.length >= (await call('GET', '/venues/mamas-kitchen')).json.services.length);

  assert.equal((await call('PATCH', path, { name: 'Mama K' }, as('user_waiter', WAITER))).status, 403);
  assert.equal((await call('PATCH', path, { phone: '0241234567' }, owner)).status, 400);
  const saved = await call(
    'PATCH',
    path,
    {
      name: 'Mama K',
      tagline: 'Jollof since 1998',
      location: { label: 'Oxford St' },
      wifi: { ssid: 'MamaK', password: 'jollof123', security: 'WPA2' },
      tax: { enabled: true, pricesIncludeTax: true, tin: 'C0012345678' },
      whatsappAlerts: '+233241234567',
    },
    owner,
  );
  expectContract('ownerUpdateVenue', 200, saved.json);
  assert.equal(saved.json.name, 'Mama K');
  // A partial location keeps the map pin.
  assert.equal(saved.json.location.lat, 5.556);
  assert.equal(saved.json.location.label, 'Oxford St');

  const guest = (await call('GET', '/venues/mamas-kitchen')).json;
  assert.equal(guest.name, 'Mama K');
  assert.equal(guest.tagline, 'Jollof since 1998');
  // The owner's alerts line and the TIN never reach guests or the kitchen.
  assert.ok(!JSON.stringify(guest).includes('241234567'));
  assert.ok(!JSON.stringify(guest).includes('C0012345678'));
  assert.equal((await call('GET', path, undefined, as('user_kitchen', KITCHEN))).json.whatsappAlerts, null);
});

test('logo and banner use uploaded photos; the logo can be removed', async () => {
  const { call, mamas, upload } = await ownerSetup();
  const slot = (await call('POST', `/owner/venues/${mamas}/media`, { kind: 'logo', contentType: 'image/png', sizeBytes: 9000 }, owner)).json;
  assert.equal((await call('PATCH', `/owner/venues/${mamas}`, { logoMediaId: slot.mediaId }, owner)).json.code, 'media_not_found');
  upload(slot.uploadUrl);
  const withLogo = await call('PATCH', `/owner/venues/${mamas}`, { logoMediaId: slot.mediaId }, owner);
  assert.equal(withLogo.json.logo.width, 800);
  assert.equal((await call('PATCH', `/owner/venues/${mamas}`, { logoMediaId: null }, owner)).json.logo, null);
});

test('the theme is made contrast-safe on the server; services and the game rule save together', async () => {
  const { call, mamas } = await ownerSetup();
  const theme = await call('PUT', `/owner/venues/${mamas}/theme`, { accent: '#FFE600', fontPair: 'serif' }, owner);
  expectContract('ownerSetTheme', 200, theme.json);
  // A light yellow can't carry white text, so guests get a safe pairing instead.
  assert.ok(theme.json.derived.ratios.buttonText >= 4.5);
  assert.equal((await call('GET', '/venues/mamas-kitchen')).json.theme.fontPair, 'serif');
  assert.equal((await call('PUT', `/owner/venues/${mamas}/theme`, { accent: 'yellow', fontPair: 'serif' }, owner)).status, 400);

  const services = await call('GET', `/owner/venues/${mamas}/services`, undefined, owner);
  expectContract('ownerGetServices', 200, services.json);
  const off = services.json.services.map((s: { enabled: boolean }, i: number) => ({ ...s, enabled: i === 0 ? false : s.enabled }));
  const put = await call('PUT', `/owner/venues/${mamas}/services`, { services: off, game: { enabled: true, minScore: 20 } }, owner);
  expectContract('ownerSetServices', 200, put.json);
  assert.deepEqual(put.json.game, { enabled: true, minScore: 20 });
  const guestIds = (await call('GET', '/venues/mamas-kitchen')).json.services.map((s: { id: string }) => s.id);
  assert.ok(!guestIds.includes(services.json.services[0].id));
  const twice = await call('PUT', `/owner/venues/${mamas}/services`, { services: [off[0], off[0]], game: { enabled: false, minScore: 15 } }, owner);
  assert.equal(twice.status, 400);
});

test('guests see a switched-on service only once it is set up: no Rewards tile while loyalty is off', async () => {
  const { call, mamas } = await ownerSetup();
  const ids = async () => (await call('GET', '/venues/mamas-kitchen')).json.services.map((s: { id: string }) => s.id);
  assert.ok((await ids()).includes('loyalty'));
  assert.ok((await ids()).includes('wifi'));
  const programme = (await call('GET', `/owner/venues/${mamas}/loyalty`, undefined, owner)).json;
  await call('PUT', `/owner/venues/${mamas}/loyalty`, { ...programme, enabled: false }, owner);
  assert.ok(!(await ids()).includes('loyalty'));
  // The owner still sees it switched on in Services, ready for when the programme is back.
  const services = (await call('GET', `/owner/venues/${mamas}/services`, undefined, owner)).json.services;
  assert.ok(services.some((s: { id: string; enabled: boolean }) => s.id === 'loyalty' && s.enabled));
});

test('the Google review link must be https, so guests are never sent to a script link', async () => {
  const { call, mamas } = await ownerSetup();
  const path = `/owner/venues/${mamas}`;
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'http://g.page/r/x']) {
    assert.equal((await call('PATCH', path, { googleReviewUrl: bad }, owner)).status, 400, bad);
  }
  assert.equal((await call('PATCH', path, { googleReviewUrl: 'https://g.page/r/mamas/review' }, owner)).status, 200);
});
