import type { ModifierGroup, ModifierGroupInput } from '@/lib/api/types';

/**
 * The add-on library (Menu.modifierGroups): groups like "Spice level" that many dishes share by
 * id, so the owner edits them once. A dish's `modifierGroups` on a read is always the full list
 * a guest sees, so the guest screens and the bill only ever read that.
 * Shared with the server (scripts/sync-server-shared.mjs), so the mock and the server agree.
 */

type DishGroups = { modifierGroupIds?: string[]; modifierGroups: ModifierGroup[] };

/** The dish with its library groups in front of its own. A group no longer in the library is skipped. */
export function resolveDish<T extends DishGroups>(dish: T, library: readonly ModifierGroup[]): T {
  const ids = dish.modifierGroupIds ?? [];
  if (ids.length === 0) return dish;
  const shared = ids.flatMap((id) => library.filter((group) => group.id === id));
  return { ...dish, modifierGroups: [...shared, ...ownGroups(dish.modifierGroups, library)] };
}

/** Every dish on the menu, resolved from the menu's own library. */
export function resolveMenu<
  T extends DishGroups,
  M extends { modifierGroups?: ModifierGroup[]; items: T[] },
>(menu: M): M {
  const library = menu.modifierGroups ?? [];
  return { ...menu, items: menu.items.map((item) => resolveDish(item, library)) };
}

/** A dish's own groups: anything that is a library group is left out, so it is never copied. */
export function ownGroups(groups: readonly ModifierGroup[], library: readonly ModifierGroup[]) {
  const shared = new Set(library.map((group) => group.id));
  return groups.filter((group) => !shared.has(group.id));
}

/** A dish after a library group is deleted: the group is no longer listed. */
export function dropGroup<T extends { modifierGroupIds?: string[] }>(dish: T, groupId: string): T {
  if (!dish.modifierGroupIds) return dish;
  return { ...dish, modifierGroupIds: dish.modifierGroupIds.filter((id) => id !== groupId) };
}

/** Null when the group can be saved, else a plain message for the owner. */
export function checkGroup(group: ModifierGroupInput): string | null {
  if (!group.name.en?.trim()) return 'Add a name for the group.';
  if (group.options.length === 0) return 'Add at least one option.';
  if (group.min > group.max) return 'The fewest choices is more than the most.';
  if (group.min > group.options.length) return 'There are fewer options than guests must pick.';
  // Add-on prices are added to the bill: a negative one would take money off it.
  const badOption = group.options.some(
    (option) =>
      !option.name.en?.trim() || !Number.isInteger(option.pricePesewas) || option.pricePesewas < 0,
  );
  return badOption ? 'Each option needs a name and a price of 0 or more.' : null;
}
