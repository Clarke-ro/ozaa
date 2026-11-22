import { injectPreview, isPreviewBot, previewFor, venueSlugFromPath } from './sharePreview';

const PAGE = `<html><head><title>Cravins</title>
<meta property="og:title" content="Cravins" />
<meta property="og:description" content="Order and pay from your table." />
<meta property="og:image" content="https://cravins-landing.vercel.app/og.png" />
<meta name="description" content="Order and pay from your table.">
</head><body></body></html>`;

describe('isPreviewBot', () => {
  it('knows the apps that fetch link previews, and not ordinary browsers', () => {
    expect(isPreviewBot('WhatsApp/2.23.20.0 A')).toBe(true);
    expect(isPreviewBot('facebookexternalhit/1.1')).toBe(true);
    expect(isPreviewBot('Twitterbot/1.0')).toBe(true);
    expect(isPreviewBot('TelegramBot (like TwitterBot)')).toBe(true);
    expect(
      isPreviewBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1'),
    ).toBe(false);
    expect(isPreviewBot(null)).toBe(false);
  });
});

describe('venueSlugFromPath', () => {
  it('finds the venue in its own page and its table pages', () => {
    expect(venueSlugFromPath('/mamas-kitchen')).toBe('mamas-kitchen');
    expect(venueSlugFromPath('/mamas-kitchen/')).toBe('mamas-kitchen');
    expect(venueSlugFromPath('/mamas-kitchen/t/12')).toBe('mamas-kitchen');
  });

  it('leaves the owner app, dev pages, files and deeper pages alone', () => {
    for (const path of [
      '/owner',
      '/owner/menu',
      '/dev/ui',
      '/_expo/static/js/x.js',
      '/icons/icon-192.png',
      '/',
      '/mamas-kitchen/menu',
      '/Mamas',
    ]) {
      expect(venueSlugFromPath(path)).toBeNull();
    }
  });
});

describe('previewFor', () => {
  it("uses the venue's name, tagline and banner", () => {
    expect(
      previewFor({
        name: "Mama's Kitchen",
        tagline: 'Jollof since 1998',
        description: { en: 'Long text' },
        banner: { url: 'https://x/b.jpg' },
        logo: null,
      }),
    ).toEqual({
      title: "Mama's Kitchen · Cravins",
      description: 'Jollof since 1998',
      image: 'https://x/b.jpg',
    });
  });

  it('falls back to the description and then the logo', () => {
    expect(
      previewFor({
        name: 'Bean',
        description: { en: 'Coffee by the airport' },
        banner: { url: '' },
        logo: { url: 'https://x/l.png' },
      }),
    ).toEqual({
      title: 'Bean · Cravins',
      description: 'Coffee by the airport',
      image: 'https://x/l.png',
    });
  });
});

describe('injectPreview', () => {
  it("puts the venue's details in the title and every preview tag", () => {
    const html = injectPreview(PAGE, {
      title: "Mama's Kitchen · Cravins",
      description: 'Jollof since 1998',
      image: 'https://x/b.jpg',
    });
    expect(html).toContain('<title>Mama&#39;s Kitchen · Cravins</title>');
    expect(html).toContain('<meta property="og:title" content="Mama&#39;s Kitchen · Cravins" />');
    expect(html).toContain('<meta property="og:description" content="Jollof since 1998" />');
    expect(html).toContain('<meta property="og:image" content="https://x/b.jpg" />');
    expect(html).toContain('<meta name="description" content="Jollof since 1998">');
  });

  it('escapes what the owner typed, so a venue name cannot inject a script', () => {
    const html = injectPreview(PAGE, {
      title: '"><script>alert(1)</script>',
      description: '<b>x</b>',
      image: 'https://x/a.jpg?a=1&b="2"',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
    expect(html).toContain('a=1&amp;b=&quot;2&quot;');
  });
});
