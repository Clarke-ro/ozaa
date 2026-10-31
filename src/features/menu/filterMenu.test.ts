import { filterMenuItems, type DietTag } from './filterMenu';

const items = [
  { id: 'jollof', categoryId: 'mains', dietary: [] as string[] },
  { id: 'salad', categoryId: 'mains', dietary: ['vegetarian', 'gluten_free'] },
  { id: 'sobolo', categoryId: 'drinks', dietary: ['vegan'] },
];

test('keeps the chosen category when no diet is selected', () => {
  expect(filterMenuItems(items, 'mains', []).map((item) => item.id)).toEqual(['jollof', 'salad']);
});

test('keeps an item only when it has every selected diet', () => {
  const both: DietTag[] = ['vegetarian', 'gluten_free'];
  expect(filterMenuItems(items, 'mains', both).map((item) => item.id)).toEqual(['salad']);
  expect(filterMenuItems(items, 'mains', ['vegan'])).toEqual([]);
});
