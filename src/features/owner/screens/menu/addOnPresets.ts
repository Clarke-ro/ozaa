import type { ModifierGroup } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';

export type MakeId = (prefix: string) => string;

/** Short random ids for new groups and options; the server swaps in its own when saved. */
export const newId: MakeId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** An empty "pick one, optional" group, the starting point for most add-ons. */
export function blankGroup(makeId: MakeId = newId): ModifierGroup {
  return {
    id: makeId('mod'),
    name: { en: '' },
    min: 0,
    max: 1,
    options: [{ id: makeId('opt'), name: { en: '' }, pricePesewas: pesewas(0) }],
  };
}

/**
 * Sizes as an add-on group: the guest must pick exactly one. Each size's price is added to the
 * dish price, so the owner sets the smallest size's dish price and types the extra for bigger ones.
 * This needs no contract change: the server already adds option prices to the line total.
 */
export function sizeGroup(
  copy: { name: string; sizes: readonly string[] },
  makeId: MakeId = newId,
): ModifierGroup {
  return {
    id: makeId('mod'),
    name: { en: copy.name },
    min: 1,
    max: 1,
    options: copy.sizes.map((size) => ({
      id: makeId('opt'),
      name: { en: size },
      pricePesewas: pesewas(0),
    })),
  };
}
