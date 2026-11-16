import { tableLink } from './tableLink';

test('a table QR opens that table on the site the app runs on', () => {
  expect(tableLink('https://cravins-app.vercel.app', 'mamas-kitchen', '12')).toBe(
    'https://cravins-app.vercel.app/mamas-kitchen/t/12',
  );
  expect(tableLink('https://cravins.app/', 'bean-there', '7')).toBe('https://cravins.app/bean-there/t/7');
});

test('an odd table code is made safe for a link', () => {
  expect(tableLink('https://x.app', 'v', 'A 1')).toBe('https://x.app/v/t/A%201');
});
