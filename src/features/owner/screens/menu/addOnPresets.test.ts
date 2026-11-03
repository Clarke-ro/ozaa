import { sizeGroup } from './addOnPresets';

const ids = (() => {
  let n = 0;
  return (prefix: string) => `${prefix}_${(n += 1)}`;
})();

test('a size group is one required choice with the three sizes at no extra cost', () => {
  const group = sizeGroup({ name: 'Size', sizes: ['Small', 'Medium', 'Large'] }, ids);
  expect(group.name.en).toBe('Size');
  expect([group.min, group.max]).toEqual([1, 1]);
  expect(group.options.map((option) => option.name.en)).toEqual(['Small', 'Medium', 'Large']);
  expect(group.options.every((option) => option.pricePesewas === 0)).toBe(true);
});

test('every option gets its own id', () => {
  const group = sizeGroup({ name: 'Size', sizes: ['S', 'M', 'L'] }, ids);
  expect(new Set(group.options.map((option) => option.id)).size).toBe(3);
});
