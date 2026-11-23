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
  assert.ok(
    read.json.services.length >= (await call('GET', '/venues/mamas-kitchen')).json.services.length,
  );

  assert.equal(
    (await call('PATCH', path, { name: 'Mama K' }, as('user_waiter', WAITER))).status,
    403,
  );
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
  assert.equal(
    (await call('GET', path, undefined, as('user_kitchen', KITCHEN))).json.whatsappAlerts,
    null,
  );
});

test('logo and banner use uploaded photos; the logo can be removed', async () => {
  const { call, mamas, upload } = await ownerSetup();
  const slot = (
    await call(
      'POST',
      `/owner/venues/${mamas}/media`,
      { kind: 'logo', contentType: 'image/png', sizeBytes: 9000 },
      owner,
    )
  ).json;
  assert.equal(
    (await call('PATCH', `/owner/venues/${mamas}`, { logoMediaId: slot.mediaId }, owner)).json.code,
    'media_not_found',
  );
  upload(slot.uploadUrl);
  const withLogo = await call(
    'PATCH',
    `/owner/venues/${mamas}`,
    { logoMediaId: slot.mediaId },
    owner,
  );
  // Logos are never shown big, so the copy is 512 wide.
  assert.equal(withLogo.json.logo.width, 512);
  assert.equal(
    (await call('PATCH', `/owner/venues/${mamas}`, { logoMediaId: null }, owner)).json.logo,
    null,
  );
});

test('the theme is made contrast-safe on the server; services and the game rule save together', async () => {
  const { call, mamas } = await ownerSetup();
  const theme = await call(
    'PUT',
    `/owner/venues/${mamas}/theme`,
    { accent: '#FFE600', fontPair: 'serif' },
    owner,
  );
  expectContract('ownerSetTheme', 200, theme.json);
  // A light yellow can't carry white text, so guests get a safe pairing instead.
  assert.ok(theme.json.derived.ratios.buttonText >= 4.5);
  assert.equal((await call('GET', '/venues/mamas-kitchen')).json.theme.fontPair, 'serif');
  assert.equal(
    (
      await call(
        'PUT',
        `/owner/venues/${mamas}/theme`,
        { accent: 'yellow', fontPair: 'serif' },
        owner,
      )
    ).status,
    400,
  );

  const services = await call('GET', `/owner/venues/${mamas}/services`, undefined, owner);
  expectContract('ownerGetServices', 200, services.json);
  const off = services.json.services.map((s: { enabled: boolean }, i: number) => ({
    ...s,
    enabled: i === 0 ? false : s.enabled,
  }));
  const put = await call(
    'PUT',
    `/owner/venues/${mamas}/services`,
    { services: off, game: { enabled: true, minScore: 20 } },
    owner,
  );
  expectContract('ownerSetServices', 200, put.json);
  assert.deepEqual(put.json.game, { enabled: true, minScore: 20 });
  const guestIds = (await call('GET', '/venues/mamas-kitchen')).json.services.map(
    (s: { id: string }) => s.id,
  );
  assert.ok(!guestIds.includes(services.json.services[0].id));
  const twice = await call(
    'PUT',
    `/owner/venues/${mamas}/services`,
    { services: [off[0], off[0]], game: { enabled: false, minScore: 15 } },
    owner,
  );
  assert.equal(twice.status, 400);
});

test('guests see a switched-on service only once it is set up: no Rewards tile while loyalty is off', async () => {
  const { call, mamas } = await ownerSetup();
  const ids = async () =>
    (await call('GET', '/venues/mamas-kitchen')).json.services.map((s: { id: string }) => s.id);
  assert.ok((await ids()).includes('loyalty'));
  assert.ok((await ids()).includes('wifi'));
  const programme = (await call('GET', `/owner/venues/${mamas}/loyalty`, undefined, owner)).json;
  await call('PUT', `/owner/venues/${mamas}/loyalty`, { ...programme, enabled: false }, owner);
  assert.ok(!(await ids()).includes('loyalty'));
  // The owner still sees it switched on in Services, ready for when the programme is back.
  const services = (await call('GET', `/owner/venues/${mamas}/services`, undefined, owner)).json
    .services;
  assert.ok(
    services.some((s: { id: string; enabled: boolean }) => s.id === 'loyalty' && s.enabled),
  );
});

test('hours, menu style, socials, online ordering and notices keep the app’s shapes', async () => {
  const { call, mamas } = await ownerSetup();
  const path = `/owner/venues/${mamas}`;
  const before = (await call('GET', path, undefined, owner)).json;

  const hours = await call('PATCH', path, { hours: before.hours }, owner);
  assert.equal(hours.status, 200);
  assert.deepEqual(hours.json.hours, before.hours);

  const style = await call(
    'PATCH',
    path,
    { menuStyle: { itemSort: 'manual', layout: 'list', colorScheme: 'dark' } },
    owner,
  );
  assert.equal(style.status, 200);
  assert.equal(style.json.menuStyle.colorScheme, 'dark');
  const part = await call('PATCH', path, { menuStyle: { layout: 'grid' } }, owner);
  assert.equal(part.json.menuStyle.layout, 'grid');
  assert.equal(part.json.menuStyle.colorScheme, 'dark');

  const socials = await call(
    'PATCH',
    path,
    {
      socials: {
        instagram: 'mamaskitchen',
        phone: '024 123 4567',
        email: null,
        website: 'https://mamas.example',
        googleReviewUrl: null,
      },
    },
    owner,
  );
  assert.equal(socials.status, 200);
  assert.equal(socials.json.socials.instagram, 'mamaskitchen');
  assert.equal(socials.json.socials.phone, '024 123 4567');

  const ordering = {
    enabled: true,
    pickup: { enabled: true, prepMinutes: 20 },
    delivery: {
      enabled: false,
      minimumFeePesewas: 0,
      feePerKmPesewas: 0,
      maxDistanceKm: 5,
      freeOverPesewas: null,
    },
  };
  assert.equal((await call('PATCH', path, { onlineOrdering: ordering }, owner)).status, 200);
  const on = {
    ...ordering,
    delivery: {
      enabled: true,
      minimumFeePesewas: 1500,
      feePerKmPesewas: 300,
      maxDistanceKm: 8,
      freeOverPesewas: 20000,
    },
  };
  assert.equal(
    (await call('PATCH', path, { onlineOrdering: on }, owner)).json.onlineOrdering.delivery
      .minimumFeePesewas,
    1500,
  );

  const notice = await call(
    'PATCH',
    path,
    {
      noticeSettings: {
        banner: {
          enabled: true,
          text: 'Kitchen closes at 9 tonight',
          startsAt: null,
          endsAt: null,
        },
        popup: {
          enabled: true,
          title: 'Tomorrow',
          text: 'Live band',
          startsAt: '2026-11-05T18:00:00.000Z',
          endsAt: null,
        },
      },
    },
    owner,
  );
  assert.equal(notice.status, 200);
  // Saving only the popup keeps the banner, including a notice with no start time.
  const popupOnly = await call(
    'PATCH',
    path,
    { noticeSettings: { popup: { enabled: false, text: 'Hi' } } },
    owner,
  );
  assert.equal(popupOnly.status, 200);
  assert.equal(popupOnly.json.noticeSettings.banner.text, 'Kitchen closes at 9 tonight');
  assert.equal(popupOnly.json.noticeSettings.popup.text, 'Hi');

  assert.equal(
    (await call('PATCH', path, { hours: { timezone: 'Africa/Accra', weekly: [] } }, owner)).status,
    400,
  );
  assert.equal(
    (await call('PATCH', path, { menuStyle: { layout: 'carousel' } }, owner)).status,
    400,
  );
  assert.equal(
    (
      await call(
        'PATCH',
        path,
        { onlineOrdering: { ...on, pickup: { enabled: true, prepMinutes: '20' } } },
        owner,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        'PATCH',
        path,
        { onlineOrdering: { ...on, delivery: { ...on.delivery, minimumFeePesewas: -100 } } },
        owner,
      )
    ).status,
    400,
  );
  assert.equal(
    (await call('GET', path, undefined, owner)).json.onlineOrdering.delivery.minimumFeePesewas,
    1500,
  );
  assert.equal(
    (
      await call(
        'PATCH',
        path,
        { noticeSettings: { banner: { enabled: true, text: 'x'.repeat(281) } } },
        owner,
      )
    ).status,
    400,
  );
  assert.equal((await call('PATCH', path, { socials: { instagram: 12 } }, owner)).status, 400);
  // A bad save leaves the hours the app already had.
  assert.deepEqual((await call('GET', path, undefined, owner)).json.hours, before.hours);
});

test('the Google review link must be https, so guests are never sent to a script link', async () => {
  const { call, mamas } = await ownerSetup();
  const path = `/owner/venues/${mamas}`;
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'http://g.page/r/x']) {
    assert.equal((await call('PATCH', path, { googleReviewUrl: bad }, owner)).status, 400, bad);
  }
  assert.equal(
    (await call('PATCH', path, { googleReviewUrl: 'https://g.page/r/mamas/review' }, owner)).status,
    200,
  );
});
