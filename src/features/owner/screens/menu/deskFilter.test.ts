import { DISH_FILTERS, filterDishes, filterCounts } from './deskFilter';

const dish = (id: string, over: Partial<Parameters<typeof filterDishes>[0][number]> = {}) => ({
  id,
  categoryId: 'mains',
  name: { en: id },
  description: { en: '' },
  available: true,
  badges: [] as ('popular' | 'new' | 'chef_pick')[],
  photo: { url: 'x', width: 1, height: 1 },
  ...over,
});

const items = [
  dish('Jollof', { badges: ['popular'] }),
  dish('Waakye', { available: false }),
  dish('Sobolo', { categoryId: 'drinks', photo: null }),
];
const order = ['mains', 'drinks'];

describe('owner menu filters', () => {
  it('lists the filter types in a fixed order, All first', () => {
    expect(DISH_FILTERS).toEqual(['all', 'on', 'off', 'popular', 'no_photo']);
  });

  it('counts each filter type', () => {
    expect(filterCounts(items)).toEqual({ all: 3, on: 2, off: 1, popular: 1, no_photo: 1 });
  });

  it('combines filter type, section and search', () => {
    const names = (f: Parameters<typeof filterDishes>[2]) => filterDishes(items, order, f).map((d) => d.id);
    expect(names({ status: 'off', section: 'all', query: '' })).toEqual(['Waakye']);
    expect(names({ status: 'all', section: 'drinks', query: '' })).toEqual(['Sobolo']);
    expect(names({ status: 'all', section: 'all', query: 'jol' })).toEqual(['Jollof']);
    expect(names({ status: 'no_photo', section: 'mains', query: '' })).toEqual([]);
  });

  it('keeps guest order: by section position, then as listed', () => {
    const mixed = [dish('Tea', { categoryId: 'drinks' }), dish('Rice')];
    expect(filterDishes(mixed, order, { status: 'all', section: 'all', query: '' }).map((d) => d.id)).toEqual([
      'Rice',
      'Tea',
    ]);
  });
});
