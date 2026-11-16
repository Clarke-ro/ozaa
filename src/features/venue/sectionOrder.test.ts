import { HOME_SECTIONS, orderSections } from './sectionOrder';

test('no saved order keeps the usual one', () => {
  expect(orderSections(undefined)).toEqual([...HOME_SECTIONS]);
});

test('the named sections come first, the rest keep their usual place', () => {
  expect(orderSections(['fun', 'table'])).toEqual(['fun', 'table', 'rewards', 'more']);
});

test('unknown or repeated names are ignored', () => {
  expect(orderSections(['socials', 'rewards', 'rewards'])).toEqual(['rewards', 'table', 'fun', 'more']);
});
