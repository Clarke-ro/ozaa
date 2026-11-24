import type { MenuItem } from '@/lib/api/types';

/** Only the fields these rules read, so tests and the mock can pass small objects. */
type Dish = Pick<MenuItem, 'pricePesewas' | 'available'> &
  Partial<
    Pick<
      MenuItem,
      'hidden' | 'salePricePesewas' | 'stockCount' | 'minQuantity' | 'maxQuantity' | 'snoozedUntil'
    >
  >;

// The contract's own ceiling for one order line (OrderLineInput.quantity maximum).
const LINE_MAX = 50;

/** True when a real sale is on: a sale price that is actually below the normal price. */
export function onSale(dish: Dish): boolean {
  return dish.salePricePesewas != null && dish.salePricePesewas < dish.pricePesewas;
}

/**
 * What one of this dish costs before add-ons. A "sale" price at or above the normal price is
 * ignored, so a typo in the owner app can never charge guests more.
 */
export function unitPrice(dish: Dish): number {
  return onSale(dish) ? (dish.salePricePesewas as number) : dish.pricePesewas;
}

/** How many a guest may put in one line: the owner's min and max, with stock capping the top. */
export function quantityLimits(dish: Dish): { min: number; max: number } {
  const min = dish.minQuantity ?? 1;
  const max = Math.min(dish.maxQuantity ?? LINE_MAX, dish.stockCount ?? LINE_MAX);
  return { min, max };
}

/**
 * Sold out right now: switched off, or snoozed until a time still to come. A snooze ends by
 * itself, so nobody has to remember to switch the dish back on after the rush.
 */
export function isSoldOut(dish: Dish, now: number): boolean {
  if (!dish.available) return true;
  return dish.snoozedUntil != null && Date.parse(dish.snoozedUntil) > now;
}

export type LineCheck = 'ok' | 'sold_out' | 'out_of_range';

/** The server's check on one order line. Sold out wins, so the guest hears the real reason. */
export function checkLine(dish: Dish, quantity: number, now: number): LineCheck {
  if (isSoldOut(dish, now) || dish.hidden) return 'sold_out';
  if (dish.stockCount != null && quantity > dish.stockCount) return 'sold_out';
  const { min, max } = quantityLimits(dish);
  return quantity < min || quantity > max ? 'out_of_range' : 'ok';
}

/** What changes on the dish after an order for `quantity`. Unlimited stock changes nothing. */
export function takeStock(
  dish: Dish,
  quantity: number,
): Partial<Pick<MenuItem, 'stockCount' | 'available'>> {
  if (dish.stockCount == null) return {};
  const left = Math.max(0, dish.stockCount - quantity);
  return left === 0 ? { stockCount: 0, available: false } : { stockCount: left };
}

/**
 * The dishes as guest screens show them: a snoozed dish reads as sold out, so every screen that
 * checks `available` gets it right. Owner screens use the stored values instead.
 */
export function asGuestSees<T extends Dish>(dishes: readonly T[], now: number): T[] {
  return dishes.map((dish) =>
    dish.available && isSoldOut(dish, now) ? { ...dish, available: false } : dish,
  );
}

/** Sold-out dishes stay on the menu with a "Sold out" label; hidden ones don't show at all. */
export function isOnGuestMenu(dish: Dish): boolean {
  return !dish.hidden;
}

export type DishStatus = 'available' | 'sold_out' | 'hidden';

/** The one status the owner picks, from the two fields the API stores. */
export function dishStatus(dish: Dish): DishStatus {
  if (dish.hidden) return 'hidden';
  return dish.available ? 'available' : 'sold_out';
}

/** The fields to save for a status the owner picked. */
export function statusFields(status: DishStatus): { available: boolean; hidden: boolean } {
  return { available: status !== 'sold_out', hidden: status === 'hidden' };
}
