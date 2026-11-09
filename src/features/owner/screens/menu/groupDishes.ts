export type DishGroup<T> = { sectionId: string; dishes: T[] };

/**
 * Splits the listed dishes into one group per section, in guest order. With no filter on,
 * empty sections stay (the owner may want to add a dish to one); with a filter on, only
 * sections with a match are kept. A dish whose section no longer exists still shows, in a
 * group of its own at the end, so nothing silently drops off the list.
 */
export function groupDishes<T extends { categoryId: string }>(
  dishes: readonly T[],
  sectionOrder: readonly string[],
  opts: { keepEmpty: boolean },
): DishGroup<T>[] {
  const known = new Set(sectionOrder);
  const groups = sectionOrder.map((sectionId) => ({
    sectionId,
    dishes: dishes.filter((d) => d.categoryId === sectionId),
  }));
  const strays = [...new Set(dishes.map((d) => d.categoryId))]
    .filter((id) => !known.has(id))
    .map((sectionId) => ({ sectionId, dishes: dishes.filter((d) => d.categoryId === sectionId) }));
  return [...groups, ...strays].filter((g) => opts.keepEmpty || g.dishes.length > 0);
}
