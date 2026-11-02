import type { MenuItem } from '@/lib/api/types';

/** The filter types an owner can pick on the Menu screen, in chip order. */
export const DISH_FILTERS = ['all', 'on', 'off', 'popular', 'no_photo'] as const;
export type DishFilter = (typeof DISH_FILTERS)[number];

type Dish = Pick<MenuItem, 'id' | 'categoryId' | 'name' | 'description' | 'available' | 'badges' | 'photo'>;

const matches: Record<DishFilter, (d: Dish) => boolean> = {
  all: () => true,
  on: (d) => d.available,
  off: (d) => !d.available,
  popular: (d) => d.badges.includes('popular'),
  no_photo: (d) => !d.photo,
};

/** How many dishes each filter chip would show. */
export function filterCounts(items: readonly Dish[]): Record<DishFilter, number> {
  return Object.fromEntries(
    DISH_FILTERS.map((f) => [f, items.filter(matches[f]).length]),
  ) as Record<DishFilter, number>;
}

/**
 * The dishes to list: filter type, then section ('all' for every section), then search by name
 * or description. Sorted the way guests see them: by section position, then as listed.
 */
export function filterDishes<T extends Dish>(
  items: readonly T[],
  sectionOrder: readonly string[],
  f: { status: DishFilter; section: string; query: string },
): T[] {
  const q = f.query.trim().toLowerCase();
  const pos = new Map(sectionOrder.map((id, i) => [id, i]));
  return items
    .filter(matches[f.status])
    .filter((d) => f.section === 'all' || d.categoryId === f.section)
    .filter(
      (d) =>
        !q ||
        d.name.en.toLowerCase().includes(q) ||
        Boolean(d.description?.en?.toLowerCase().includes(q)),
    )
    .sort((a, b) => (pos.get(a.categoryId) ?? 0) - (pos.get(b.categoryId) ?? 0));
}
