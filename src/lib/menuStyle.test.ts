import type { MenuItem } from '@/lib/api/types';
import { guestScheme, menuStyleOf, sortDishes } from './menuStyle';

const dish = (
  id: string,
  name: string,
  pricePesewas: number,
  badges: MenuItem['badges'] = [],
  salePricePesewas?: number,
) => ({ id, name: { en: name }, pricePesewas, available: true, badges, salePricePesewas });

const dishes = [
  dish('a', 'Waakye', 4500),
  dish('b', 'banku', 9000, ['popular']),
  dish('c', 'Jollof', 6500, [], 4000),
  dish('d', 'Sobolo', 1500, ['popular']),
];
const ids = (list: readonly { id: string }[]) => list.map((dish) => dish.id);

test('missing style means manual order, list and light', () => {
  expect(menuStyleOf(undefined)).toEqual({
    itemSort: 'manual',
    layout: 'list',
    colorScheme: 'light',
  });
  expect(menuStyleOf({ layout: 'grid' })).toEqual({
    itemSort: 'manual',
    layout: 'grid',
    colorScheme: 'light',
  });
});

test('manual keeps the owner order', () => {
  expect(ids(sortDishes(dishes, 'manual'))).toEqual(['a', 'b', 'c', 'd']);
});

test('name sorts A to Z, ignoring capitals', () => {
  expect(ids(sortDishes(dishes, 'name'))).toEqual(['b', 'c', 'd', 'a']);
});

test('price sorts by what the guest pays, so a sale counts', () => {
  expect(ids(sortDishes(dishes, 'price_low'))).toEqual(['d', 'c', 'a', 'b']);
  expect(ids(sortDishes(dishes, 'price_high'))).toEqual(['b', 'a', 'c', 'd']);
});

test('popular first keeps the owner order inside each group', () => {
  expect(ids(sortDishes(dishes, 'popular_first'))).toEqual(['b', 'd', 'a', 'c']);
});

test('sorting never changes the list it was given', () => {
  const copy = [...dishes];
  sortDishes(dishes, 'name');
  expect(dishes).toEqual(copy);
});

test('auto follows the phone; light and dark are fixed', () => {
  expect(guestScheme('auto', 'dark')).toBe('dark');
  expect(guestScheme('auto', null)).toBe('light');
  expect(guestScheme('dark', 'light')).toBe('dark');
  expect(guestScheme('light', 'dark')).toBe('light');
});
