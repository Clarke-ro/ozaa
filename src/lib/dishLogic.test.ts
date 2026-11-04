import { addOnTotal, canQuickAdd, missingChoice, pickOption, searchItems } from './dishLogic';

const spice = {
  id: 'g1',
  name: { en: 'Spice' },
  min: 1,
  max: 1,
  options: [
    { id: 'mild', name: { en: 'Mild' }, pricePesewas: 0 },
    { id: 'hot', name: { en: 'Hot' }, pricePesewas: 0 },
  ],
};
const extras = {
  id: 'g2',
  name: { en: 'Extras' },
  min: 0,
  max: 2,
  options: [
    { id: 'egg', name: { en: 'Egg' }, pricePesewas: 300 },
    { id: 'meat', name: { en: 'Meat' }, pricePesewas: 800 },
    { id: 'fish', name: { en: 'Fish' }, pricePesewas: 900 },
  ],
};

test('a pick-one group swaps the choice', () => {
  expect(pickOption(spice, ['mild'], 'hot')).toEqual(['hot']);
});

test('a pick-many group toggles, and never goes past its maximum', () => {
  expect(pickOption(extras, ['egg'], 'meat')).toEqual(['egg', 'meat']);
  expect(pickOption(extras, ['egg', 'meat'], 'fish')).toEqual(['egg', 'meat']);
  expect(pickOption(extras, ['egg', 'meat'], 'egg')).toEqual(['meat']);
});

test('add-on total sums the picked options across groups', () => {
  expect(addOnTotal([spice, extras], { g1: ['hot'], g2: ['egg', 'meat'] })).toBe(1100);
});

test('the first group still missing a required choice is reported', () => {
  expect(missingChoice([spice, extras], {})?.id).toBe('g1');
  expect(missingChoice([spice, extras], { g1: ['mild'] })).toBeNull();
});

test('only dishes with no required choice can be added straight from the grid', () => {
  expect(canQuickAdd({ available: true, modifierGroups: [extras] })).toBe(true);
  expect(canQuickAdd({ available: true, modifierGroups: [spice] })).toBe(false);
  expect(canQuickAdd({ available: false, modifierGroups: [] })).toBe(false);
});

test('search matches name or description, ignoring case and accents', () => {
  const items = [
    { name: { en: 'Kelewele' }, description: { en: 'Spiced plantain' } },
    { name: { en: 'Jollof' }, description: { en: 'Smoky rice' } },
  ];
  expect(searchItems(items, 'PLANTAIN').map((i) => i.name.en)).toEqual(['Kelewele']);
  expect(searchItems(items, '  ')).toEqual(items);
});
