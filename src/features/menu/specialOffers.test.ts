import { specialOffers } from './specialOffers';

const dish = (id: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    categoryId: 'cat_1',
    pricePesewas: 5000,
    available: true,
    hidden: false,
    ...extra,
  }) as never;
const now = Date.parse('2026-11-16T12:00:00Z');

test('nothing on offer: no section', () => {
  expect(specialOffers([dish('a')], [], now)).toEqual([]);
});

test('a dish on sale shows, with no offer title', () => {
  const rows = specialOffers([dish('a', { salePricePesewas: 4000 }), dish('b')], [], now);
  expect(rows).toEqual([{ kind: 'dish', item: expect.objectContaining({ id: 'a' }), label: null }]);
});

test('an offer for a dish shows that dish once, with the offer title, even if it is also on sale', () => {
  const rows = specialOffers(
    [dish('a', { salePricePesewas: 4000 })],
    [{ id: 'o1', title: { en: 'Jollof Tuesday' }, menuItemId: 'a', endsAt: null }],
    now,
  );
  expect(rows).toEqual([
    { kind: 'dish', item: expect.objectContaining({ id: 'a' }), label: 'Jollof Tuesday' },
  ]);
});

test('a general offer shows as a note; ended offers and hidden or sold-out dishes do not', () => {
  const rows = specialOffers(
    [
      dish('gone', { hidden: true, salePricePesewas: 1 }),
      dish('out', { available: false, salePricePesewas: 1 }),
    ],
    [
      { id: 'o1', title: { en: 'Happy hour' }, detail: { en: '4 to 6 PM' }, endsAt: null },
      { id: 'o2', title: { en: 'Ended' }, endsAt: '2026-11-16T11:00:00Z' },
      { id: 'o3', title: { en: 'Hidden dish' }, menuItemId: 'gone', endsAt: null },
    ],
    now,
  );
  expect(rows).toEqual([{ kind: 'note', id: 'o1', title: 'Happy hour', detail: '4 to 6 PM' }]);
});
