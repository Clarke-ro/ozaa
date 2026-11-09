import { groupDishes } from './groupDishes';

const dish = (id: string, categoryId: string) => ({ id, categoryId });
const sections = ['mains', 'sides', 'drinks'];

test('dishes sit under their section, in the order guests see the sections', () => {
  const groups = groupDishes([dish('Tea', 'drinks'), dish('Rice', 'mains')], sections, {
    keepEmpty: false,
  });
  expect(groups.map((g) => [g.sectionId, g.dishes.map((d) => d.id)])).toEqual([
    ['mains', ['Rice']],
    ['drinks', ['Tea']],
  ]);
});

test('with no filter on, empty sections stay so a dish can be added to them', () => {
  const groups = groupDishes([dish('Rice', 'mains')], sections, { keepEmpty: true });
  expect(groups.map((g) => [g.sectionId, g.dishes.length])).toEqual([
    ['mains', 1],
    ['sides', 0],
    ['drinks', 0],
  ]);
});

test('with a filter on, sections with no match are left out', () => {
  const groups = groupDishes([dish('Rice', 'mains')], sections, { keepEmpty: false });
  expect(groups.map((g) => g.sectionId)).toEqual(['mains']);
});

test('a dish whose section is gone is not lost: it goes in its own group at the end', () => {
  const groups = groupDishes([dish('Old', 'deleted'), dish('Rice', 'mains')], sections, {
    keepEmpty: false,
  });
  expect(groups.map((g) => [g.sectionId, g.dishes.map((d) => d.id)])).toEqual([
    ['mains', ['Rice']],
    ['deleted', ['Old']],
  ]);
});
