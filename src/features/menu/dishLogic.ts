import type { ModifierGroup } from '@/lib/api/types';

type Picks = Record<string, string[]>;

/** Tap an option. A pick-one group swaps; a pick-many group toggles and stops at its maximum. */
export function pickOption(group: ModifierGroup, picked: string[], optionId: string): string[] {
  if (group.max === 1) return picked.includes(optionId) && group.min === 0 ? [] : [optionId];
  if (picked.includes(optionId)) return picked.filter((id) => id !== optionId);
  return picked.length >= group.max ? picked : [...picked, optionId];
}

/** Extra cost of the picked add-ons, in minor units. */
export function addOnTotal(groups: ModifierGroup[], picks: Picks): number {
  return groups.reduce(
    (sum, g) =>
      sum +
      g.options
        .filter((o) => (picks[g.id] ?? []).includes(o.id))
        .reduce((s, o) => s + o.pricePesewas, 0),
    0,
  );
}

/** The first group that still needs a choice, so the screen can point the guest at it. */
export function missingChoice(groups: ModifierGroup[], picks: Picks): ModifierGroup | null {
  return groups.find((g) => (picks[g.id] ?? []).length < g.min) ?? null;
}

/** A dish goes straight into the order from the grid only when nothing has to be chosen first. */
export function canQuickAdd(item: {
  available: boolean;
  modifierGroups: ModifierGroup[];
}): boolean {
  return item.available && item.modifierGroups.every((g) => g.min === 0);
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Dishes whose name or description contains the query. An empty query keeps them all. */
export function searchItems<T extends { name: { en: string }; description: { en?: string } }>(
  items: T[],
  query: string,
): T[] {
  const q = fold(query.trim());
  if (!q) return items;
  return items.filter(
    (i) => fold(i.name.en).includes(q) || fold(i.description.en ?? '').includes(q),
  );
}
