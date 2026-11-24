import type { Menu, MenuItem, ModifierGroup } from '@/lib/api/types';
import { channelMenu, raisePrice } from './channelMenu';

const NOW = Date.parse('2026-11-24T12:00:00.000Z'); // a Tuesday, 12:00 in Accra
const SAME = { percent: 0, roundToPesewas: 1 as const };
const PLUS_20 = { percent: 20, roundToPesewas: 50 as const };

const option = (id: string, en: string, pricePesewas: number) => ({
  id,
  name: { en },
  pricePesewas,
});
const size: ModifierGroup = {
  id: 'grp_size',
  name: { en: 'Size' },
  min: 1,
  max: 1,
  options: [option('opt_reg', 'Regular', 0), option('opt_lg', 'Large', 1000)],
};
const spice: ModifierGroup = {
  id: 'grp_spice',
  name: { en: 'Spice' },
  min: 1,
  max: 1,
  options: [option('opt_mild', 'Mild', 0)],
};
const extras: ModifierGroup = {
  id: 'grp_extra',
  name: { en: 'Extras' },
  min: 0,
  max: 2,
  options: [option('opt_egg', 'Egg', 300)],
};

function dish(id: string, over: Partial<MenuItem> = {}): MenuItem {
  return {
    id,
    categoryId: 'cat_mains',
    name: { en: id },
    description: { en: `About ${id}` },
    pricePesewas: 5000,
    available: true,
    dietary: [],
    badges: [],
    modifierGroups: [],
    ...over,
  };
}

function menu(items: MenuItem[], categories: Menu['categories'] = []): Menu {
  return {
    venueId: 'ven_1',
    updatedAt: '2026-11-24T10:00:00.000Z',
    categories: [
      { id: 'cat_mains', name: { en: 'Mains' }, kind: 'food', position: 0 },
      { id: 'cat_drinks', name: { en: 'Drinks' }, kind: 'drinks', position: 0 },
      ...categories,
    ],
    items,
  };
}

describe('raisePrice', () => {
  test('0% is the menu price exactly, with no rounding', () => {
    expect(raisePrice(4999, SAME)).toBe(4999);
    expect(raisePrice(4999, { percent: 0, roundToPesewas: 100 })).toBe(4999);
  });
  test('raises by the percent, then rounds up to the step', () => {
    expect(raisePrice(5000, PLUS_20)).toBe(6000);
    expect(raisePrice(4550, PLUS_20)).toBe(5500); // 5460 → next GH₵0.50
    expect(raisePrice(1001, { percent: 10, roundToPesewas: 1 })).toBe(1102); // 1101.1 → up
  });
  test('never lowers a price', () => {
    expect(raisePrice(0, PLUS_20)).toBe(0);
  });
});

describe('channelMenu', () => {
  test('a plain dish is sent at the channel price, using the sale price when there is one', () => {
    const out = channelMenu(
      menu([dish('jollof', { salePricePesewas: 4000 })]),
      { priceRule: PLUS_20, hiddenItemIds: [] },
      NOW,
    );
    expect(out.dishes).toEqual([
      expect.objectContaining({
        ref: 'jollof',
        itemId: 'jollof',
        name: 'jollof',
        pricePesewas: 4800,
        inStock: true,
        sectionRef: 'cat_mains',
      }),
    ]);
    expect(out.problems).toEqual([]);
  });

  test('hidden dishes, dishes the channel leaves out and hidden sections are not sent', () => {
    const out = channelMenu(
      menu(
        [
          dish('a', { hidden: true }),
          dish('b'),
          dish('c'),
          dish('d', { categoryId: 'cat_secret' }),
        ],
        [{ id: 'cat_secret', name: { en: 'Secret' }, kind: 'food', position: 1, hidden: true }],
      ),
      { priceRule: SAME, hiddenItemIds: ['c'] },
      NOW,
    );
    expect(out.dishes.map((d) => d.ref)).toEqual(['b']);
    expect(out.sections.map((s) => s.ref)).toEqual(['cat_mains']);
  });

  test('sold out, snoozed and outside its section hours: sent, but out of stock', () => {
    const out = channelMenu(
      menu(
        [
          dish('off', { available: false }),
          dish('nap', { snoozedUntil: '2026-11-24T17:00:00.000Z' }),
          dish('brunch', { categoryId: 'cat_brunch' }),
        ],
        [
          {
            id: 'cat_brunch',
            name: { en: 'Brunch' },
            kind: 'food',
            position: 1,
            schedule: { startTime: '07:00', endTime: '11:00' },
          },
        ],
      ),
      { priceRule: SAME, hiddenItemIds: [] },
      NOW,
    );
    expect(out.dishes.map((d) => [d.ref, d.inStock])).toEqual([
      ['off', false],
      ['nap', false],
      ['brunch', false],
    ]);
  });

  test('a dish with sizes becomes one dish per size, each at its own price', () => {
    const out = channelMenu(
      menu([dish('waakye', { modifierGroups: [size] })]),
      { priceRule: PLUS_20, hiddenItemIds: [] },
      NOW,
    );
    expect(out.dishes.map((d) => [d.ref, d.name, d.pricePesewas])).toEqual([
      ['waakye--opt_reg', 'waakye · Regular', 6000],
      ['waakye--opt_lg', 'waakye · Large', 7200],
    ]);
    expect(out.dishes.every((d) => d.itemId === 'waakye')).toBe(true);
  });

  test('another required choice the channel cannot take: not sent, and the owner is told why', () => {
    const out = channelMenu(
      menu([dish('kenkey', { modifierGroups: [size, spice] })]),
      { priceRule: SAME, hiddenItemIds: [] },
      NOW,
    );
    expect(out.dishes).toEqual([]);
    expect(out.problems).toEqual([
      {
        code: 'needs_addons',
        itemId: 'kenkey',
        message: 'kenkey needs a choice (Spice) that Chowdeck can’t show yet, so it isn’t sent.',
      },
    ]);
  });

  test('optional add-ons are left off, and the dish says so', () => {
    const out = channelMenu(
      menu([dish('rice', { modifierGroups: [extras] })]),
      { priceRule: SAME, hiddenItemIds: [] },
      NOW,
    );
    expect(out.dishes).toEqual([expect.objectContaining({ ref: 'rice', droppedAddOns: true })]);
    expect(out.problems).toEqual([]);
  });

  test('sections keep the guest order: food first, then drinks; dishes keep the owner order', () => {
    const out = channelMenu(
      menu([
        dish('water', { categoryId: 'cat_drinks' }),
        dish('b', { position: 2 }),
        dish('a', { position: 1 }),
      ]),
      { priceRule: SAME, hiddenItemIds: [] },
      NOW,
    );
    expect(out.sections.map((s) => [s.ref, s.rank])).toEqual([
      ['cat_mains', 0],
      ['cat_drinks', 1],
    ]);
    expect(out.dishes.map((d) => [d.ref, d.rank])).toEqual([
      ['a', 0],
      ['b', 1],
      ['water', 0],
    ]);
  });

  test('the photo goes as a public URL, or null', () => {
    const photo = { url: 'https://cdn.example.com/j.webp', width: 1080, height: 720 };
    const out = channelMenu(
      menu([dish('j', { photo }), dish('k')]),
      { priceRule: SAME, hiddenItemIds: [] },
      NOW,
    );
    expect(out.dishes.map((d) => d.photoUrl)).toEqual(['https://cdn.example.com/j.webp', null]);
  });
});
