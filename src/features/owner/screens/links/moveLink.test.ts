import { reorderLinks, shortUrl } from './moveLink';

const links = [
  { id: 'a', sortOrder: 0 },
  { id: 'b', sortOrder: 1 },
  { id: 'c', sortOrder: 2 },
];

test('dragging the last link to the top renumbers only the ones that moved', () => {
  expect(reorderLinks(links, ['c', 'a', 'b'])).toEqual([
    { id: 'c', sortOrder: 0 },
    { id: 'a', sortOrder: 1 },
    { id: 'b', sortOrder: 2 },
  ]);
  expect(reorderLinks(links, ['b', 'a', 'c'])).toEqual([
    { id: 'b', sortOrder: 0 },
    { id: 'a', sortOrder: 1 },
  ]);
});

test('the same order saves nothing', () => {
  expect(reorderLinks(links, ['a', 'b', 'c'])).toEqual([]);
});

test('shortUrl keeps the host and path, without the scheme, www or a trailing slash', () => {
  expect(shortUrl('https://www.instagram.com/mamaskitchen/')).toBe('instagram.com/mamaskitchen');
  expect(shortUrl('https://mamas.kitchen/')).toBe('mamas.kitchen');
  expect(shortUrl('not a url')).toBe('not a url');
});
