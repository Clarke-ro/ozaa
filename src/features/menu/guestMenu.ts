import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { unitPrice } from '@/lib/dishRules';
import { isCategoryAvailable } from '@/lib/menuSchedule';

/**
 * Plain rules for the guest menu (BUILD.md 5b.6): one scrolling page of the sections that are on
 * now, sold-out dishes last in each, "from" prices for dishes with a required choice, and which
 * section the guest has scrolled to.
 */

/** Sections guests see now: not hidden, inside their hours, food first then drinks. */
export function sectionsOnNow(categories: readonly MenuCategory[], now: Date): MenuCategory[] {
  return categories
    .filter((c) => !c.hidden && isCategoryAvailable(c.schedule, now))
    .sort((a, b) => (a.kind === b.kind ? a.position - b.position : a.kind === 'food' ? -1 : 1));
}

/** The owner's order, with dishes guests can't order right now moved to the end. */
export function soldOutLast<T extends { available: boolean }>(dishes: readonly T[]): T[] {
  return [...dishes.filter((d) => d.available), ...dishes.filter((d) => !d.available)];
}

/**
 * The lowest a guest can pay for one: the dish price plus the cheapest option of each required
 * choice (a size, say). `from` is true when a required choice changes the price, so the row
 * reads "from GH₵45" instead of a price nobody can order at.
 */
export function priceFrom(
  dish: Pick<MenuItem, 'pricePesewas' | 'available' | 'modifierGroups'> &
    Partial<Pick<MenuItem, 'salePricePesewas'>>,
): { from: boolean; pesewas: number } {
  let pesewas = unitPrice(dish);
  let from = false;
  for (const group of dish.modifierGroups.filter((g) => g.min > 0)) {
    const prices = group.options.map((o) => o.pricePesewas).sort((a, b) => a - b);
    // The cheapest `min` options a guest must pick.
    pesewas += prices.slice(0, group.min).reduce((sum, p) => sum + p, 0);
    if (new Set(prices).size > 1) from = true;
  }
  return { from, pesewas };
}

/**
 * The section a guest is reading: the last one whose heading has reached the bar at the top.
 * `y` is how far the list has scrolled plus the bar's height.
 */
export function activeSection(
  headings: readonly { id: string; y: number }[],
  y: number,
): string | null {
  let active: string | null = headings[0]?.id ?? null;
  for (const heading of headings) if (heading.y <= y) active = heading.id;
  return active;
}
