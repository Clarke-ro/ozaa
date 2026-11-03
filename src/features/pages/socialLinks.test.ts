import { socialLinks } from './socialLinks';

test('handles become profile links; full links and blanks are respected', () => {
  expect(
    socialLinks({
      instagram: '@mamas',
      facebook: 'facebook.com/mamas',
      tiktok: 'mamas',
      website: 'mamas.kitchen',
      x: '',
      youtube: null,
    }),
  ).toEqual([
    { key: 'instagram', url: 'https://instagram.com/mamas' },
    { key: 'facebook', url: 'https://facebook.com/mamas' },
    { key: 'tiktok', url: 'https://www.tiktok.com/@mamas' },
    { key: 'website', url: 'https://mamas.kitchen' },
  ]);
});

test('email and phone use their own schemes; anything else is ignored', () => {
  expect(
    socialLinks({ email: 'hi@mamas.kitchen', phone: '+233 30 000 0000', enabledLinks: ['x'] }),
  ).toEqual([
    { key: 'phone', url: 'tel:+233300000000' },
    { key: 'email', url: 'mailto:hi@mamas.kitchen' },
  ]);
});

test('a javascript: value never becomes a link', () => {
  expect(socialLinks({ website: 'javascript:alert(1)' })).toEqual([]);
});
