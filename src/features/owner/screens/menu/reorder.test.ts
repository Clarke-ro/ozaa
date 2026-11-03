import { moveSection, sortSections } from './reorder';

const cats = [
  { id: 'a', position: 0 },
  { id: 'b', position: 1 },
  { id: 'c', position: 2 },
];

test('moving down swaps with the next section and returns only what changed', () => {
  expect(moveSection(cats, 'a', 'down')).toEqual([
    { id: 'b', position: 0 },
    { id: 'a', position: 1 },
  ]);
});

test('moving up swaps with the previous section', () => {
  expect(moveSection(cats, 'c', 'up')).toEqual([
    { id: 'c', position: 1 },
    { id: 'b', position: 2 },
  ]);
});

test('the first cannot go up and the last cannot go down', () => {
  expect(moveSection(cats, 'a', 'up')).toEqual([]);
  expect(moveSection(cats, 'c', 'down')).toEqual([]);
});

test('gaps and duplicate positions are tidied into 0..n-1 before moving', () => {
  const messy = [
    { id: 'x', position: 5 },
    { id: 'y', position: 5 },
    { id: 'z', position: 9 },
  ];
  // x and y tie; the original order breaks the tie, so y is second.
  expect(moveSection(messy, 'z', 'up').sort((p, q) => p.position - q.position)).toEqual([
    { id: 'x', position: 0 },
    { id: 'z', position: 1 },
    { id: 'y', position: 2 },
  ]);
});

test('sortSections orders by position, then by original order', () => {
  expect(
    sortSections([
      { id: 'b', position: 2 },
      { id: 'a', position: 1 },
    ]).map((c) => c.id),
  ).toEqual(['a', 'b']);
});
