import { moveLink } from './moveLink';

const links = [
  { id: 'a', sortOrder: 0 },
  { id: 'b', sortOrder: 1 },
  { id: 'c', sortOrder: 2 },
];

test('moving up swaps with the one above; only changed links come back', () => {
  expect(moveLink(links, 'c', -1)).toEqual([
    { id: 'c', sortOrder: 1 },
    { id: 'b', sortOrder: 2 },
  ]);
});

test('the first cannot go up and the last cannot go down', () => {
  expect(moveLink(links, 'a', -1)).toEqual([]);
  expect(moveLink(links, 'c', 1)).toEqual([]);
});

test('gaps or repeats in old numbers are cleaned up into 0, 1, 2', () => {
  const messy = [
    { id: 'a', sortOrder: 5 },
    { id: 'b', sortOrder: 5 },
    { id: 'c', sortOrder: 9 },
  ];
  expect(moveLink(messy, 'a', 1)).toEqual([
    { id: 'b', sortOrder: 0 },
    { id: 'a', sortOrder: 1 },
    { id: 'c', sortOrder: 2 },
  ]);
});
