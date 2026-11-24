import type { ModifierGroup } from '@/lib/api/types';
import { checkGroup, dropGroup, ownGroups, resolveDish, resolveMenu } from './addOns';

const none: ModifierGroup[] = [];

const name = (en: string) => ({ en });
const spice = {
  id: 'mg_spice',
  name: name('Spice level'),
  min: 1,
  max: 1,
  options: [{ id: 'mo_mild', name: name('Mild'), pricePesewas: 0 }],
};
const sides = {
  id: 'mg_sides',
  name: name('Sides'),
  min: 0,
  max: 2,
  options: [{ id: 'mo_plantain', name: name('Plantain'), pricePesewas: 800 }],
};
const own = {
  id: 'grp_extra',
  name: name('Extra meat'),
  min: 0,
  max: 1,
  options: [{ id: 'opt_beef', name: name('Beef'), pricePesewas: 1500 }],
};
const library = [spice, sides];

describe('resolveDish', () => {
  test('library groups come first, in the dish order, then its own', () => {
    const dish = { modifierGroupIds: ['mg_sides', 'mg_spice'], modifierGroups: [own] };
    expect(resolveDish(dish, library).modifierGroups.map((g) => g.id)).toEqual([
      'mg_sides',
      'mg_spice',
      'grp_extra',
    ]);
  });

  test('a group that left the library is skipped, never an error', () => {
    const dish = { modifierGroupIds: ['mg_gone', 'mg_spice'], modifierGroups: none };
    expect(resolveDish(dish, library).modifierGroups.map((g) => g.id)).toEqual(['mg_spice']);
  });

  test('a dish without ids keeps exactly its own groups', () => {
    const dish = { modifierGroups: [own] };
    expect(resolveDish(dish, library).modifierGroups).toEqual([own]);
  });

  test('editing the library changes every dish that uses it', () => {
    const hotter = { ...spice, options: [{ id: 'mo_hot', name: name('Hot'), pricePesewas: 0 }] };
    const dish = { modifierGroupIds: ['mg_spice'], modifierGroups: none };
    expect(resolveDish(dish, [hotter]).modifierGroups[0]!.options[0]!.id).toBe('mo_hot');
  });
});

test('resolveMenu resolves every dish from the menu library', () => {
  const menu = {
    modifierGroups: library,
    items: [{ id: 'a', modifierGroupIds: ['mg_spice'], modifierGroups: none }],
  };
  expect(resolveMenu(menu).items[0]!.modifierGroups).toEqual([spice]);
});

test('ownGroups drops library groups, so sending back what was read never copies them', () => {
  expect(ownGroups([spice, own, sides], library)).toEqual([own]);
});

test('dropGroup takes a deleted group off a dish', () => {
  expect(dropGroup({ modifierGroupIds: ['mg_spice', 'mg_sides'] }, 'mg_spice')).toEqual({
    modifierGroupIds: ['mg_sides'],
  });
  expect(dropGroup({}, 'mg_spice')).toEqual({});
});

describe('checkGroup', () => {
  const ok = {
    name: name('Size'),
    min: 1,
    max: 1,
    options: [{ name: name('Large'), pricePesewas: 500 }],
  };
  test('a normal group is fine', () => {
    expect(checkGroup(ok)).toBeNull();
  });
  test('needs a name, at least one option and sensible limits', () => {
    expect(checkGroup({ ...ok, name: name('  ') })).toBe('Add a name for the group.');
    expect(checkGroup({ ...ok, options: [] })).toBe('Add at least one option.');
    expect(checkGroup({ ...ok, min: 2, max: 1 })).toBe('The fewest choices is more than the most.');
    expect(checkGroup({ ...ok, min: 2, max: 2 })).toBe(
      'There are fewer options than guests must pick.',
    );
  });
  test('option prices are whole, non-negative pesewas, or the bill could shrink', () => {
    const bad = { ...ok, options: [{ name: name('Large'), pricePesewas: -100 }] };
    expect(checkGroup(bad)).toBe('Each option needs a name and a price of 0 or more.');
  });
});
