import type { MenuItem, MenuStyle } from '@/lib/api/types';
import { unitPrice } from '@/lib/dishRules';

export type FullMenuStyle = Required<MenuStyle>;
type Sort = FullMenuStyle['itemSort'];

/** The venue's menu style with every default filled in (the contract's defaults). */
export function menuStyleOf(style: MenuStyle | null | undefined): FullMenuStyle {
  return {
    itemSort: style?.itemSort ?? 'manual',
    layout: style?.layout ?? 'list',
    colorScheme: style?.colorScheme ?? 'light',
  };
}

type Dish = Pick<MenuItem, 'id' | 'name' | 'pricePesewas' | 'available' | 'badges'> &
  Partial<Pick<MenuItem, 'salePricePesewas' | 'position'>>;

/**
 * Dishes in the venue's chosen order. Always a new array, and stable: dishes that tie keep the
 * owner's order, so "Popular first" still respects how the owner arranged each group.
 */
export function sortDishes<T extends Dish>(dishes: readonly T[], sort: Sort): T[] {
  const list = [...dishes];
  switch (sort) {
    case 'manual': {
      // Dishes with a position come first, in that order; the rest keep the menu's own order.
      const rank = (dish: T) => dish.position ?? Number.POSITIVE_INFINITY;
      // Two dishes without a position give Infinity - Infinity = NaN; `|| 0` turns that into a tie.
      return list.sort((a, b) => rank(a) - rank(b) || 0);
    }
    case 'name':
      return list.sort((a, b) =>
        a.name.en.localeCompare(b.name.en, undefined, { sensitivity: 'base' }),
      );
    case 'price_low':
      return list.sort((a, b) => unitPrice(a) - unitPrice(b));
    case 'price_high':
      return list.sort((a, b) => unitPrice(b) - unitPrice(a));
    case 'popular_first': {
      const popular = (dish: T) => (dish.badges.includes('popular') ? 0 : 1);
      return list.sort((a, b) => popular(a) - popular(b));
    }
  }
}

/** Light or dark for the guest pages. "auto" follows the guest's phone; unknown means light. */
export function guestScheme(
  choice: FullMenuStyle['colorScheme'],
  phone: 'light' | 'dark' | null | undefined,
): 'light' | 'dark' {
  if (choice === 'auto') return phone === 'dark' ? 'dark' : 'light';
  return choice;
}

/** Guests can see the menu unless the owner has unpublished it. Missing means published. */
export function isPublished(venue: { published?: boolean }): boolean {
  return venue.published !== false;
}
