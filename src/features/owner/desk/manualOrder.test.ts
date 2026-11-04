import type { MenuItem, ModifierGroup } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { manualOrder, type DraftLine } from './manualOrder';

const size: ModifierGroup = {
  id: 'g_size',
  name: { en: 'Size' },
  min: 1,
  max: 1,
  options: [
    { id: 'o_s', name: { en: 'Small' }, pricePesewas: pesewas(0) },
    { id: 'o_l', name: { en: 'Large' }, pricePesewas: pesewas(1500) },
  ],
};
const jollof = {
  id: 'itm_j',
  pricePesewas: 6500,
  salePricePesewas: 5000,
  available: true,
  modifierGroups: [size],
} as unknown as MenuItem;
const sobolo = {
  id: 'itm_s',
  pricePesewas: 1500,
  available: true,
  modifierGroups: [],
} as unknown as MenuItem;

test('an empty order cannot be sent', () => {
  expect(manualOrder([])).toEqual({ ok: false, reason: 'empty' });
});

test('a dish whose required choice is missing is named, so staff can fix it', () => {
  const lines: DraftLine[] = [{ key: '1', item: jollof, quantity: 1, picks: {} }];
  expect(manualOrder(lines)).toEqual({ ok: false, reason: 'choice', key: '1', group: 'Size' });
});

test('lines and the estimate use the sale price plus add-ons, times quantity', () => {
  const lines: DraftLine[] = [
    { key: '1', item: jollof, quantity: 2, picks: { g_size: ['o_l'] } },
    { key: '2', item: sobolo, quantity: 3, picks: {} },
  ];
  expect(manualOrder(lines)).toEqual({
    ok: true,
    lines: [
      { menuItemId: 'itm_j', quantity: 2, modifierOptionIds: ['o_l'] },
      { menuItemId: 'itm_s', quantity: 3, modifierOptionIds: [] },
    ],
    // (5000 + 1500) × 2 + 1500 × 3
    estimatePesewas: 17500,
  });
});

test('a line taken down to 0 is left out', () => {
  const lines: DraftLine[] = [
    { key: '1', item: sobolo, quantity: 0, picks: {} },
    { key: '2', item: sobolo, quantity: 1, picks: {} },
  ];
  const result = manualOrder(lines);
  expect(result.ok && result.lines.length).toBe(1);
});
