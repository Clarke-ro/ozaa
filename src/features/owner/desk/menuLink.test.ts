import { embedSnippet, menuLink } from './menuLink';

test('the menu link is the site address plus the venue slug, with no double slash', () => {
  expect(menuLink('https://ozaa.app', 'mamas-kitchen')).toBe('https://ozaa.app/mamas-kitchen');
  expect(menuLink('https://ozaa.app/', 'mamas-kitchen')).toBe('https://ozaa.app/mamas-kitchen');
});

test('the embed snippet is an iframe of the menu link with a readable title', () => {
  const html = embedSnippet('https://ozaa.app/mamas-kitchen', "Mama's Kitchen");
  expect(html).toContain('src="https://ozaa.app/mamas-kitchen"');
  expect(html).toContain('title="Mama&#39;s Kitchen menu"');
  expect(html.startsWith('<iframe')).toBe(true);
});

test('a venue name cannot break out of the snippet', () => {
  const html = embedSnippet('https://ozaa.app/x', '"><script>alert(1)</script>');
  expect(html).not.toContain('<script>');
});
