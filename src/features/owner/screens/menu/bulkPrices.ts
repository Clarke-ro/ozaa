/**
 * "Change prices" on the menu: every listed dish up or down by a percent, to the nearest step
 * (GH₵0.50, say) so prices stay tidy. Whole pesewas only.
 */

/** The new price. Never below one step, so a big cut can't make a dish free by accident. */
export function changePrice(pesewas: number, percent: number, step: number): number {
  const raised = (pesewas * (100 + percent)) / 100;
  return Math.max(step, Math.round(raised / step) * step);
}

type Priced = { id: string; pricePesewas: number; salePricePesewas?: number | null };
export type PriceUpdate = { id: string; pricePesewas: number; salePricePesewas: number | null };

/**
 * The saves to make: only dishes whose price really changes. A sale price moves with the price;
 * if it would no longer be below it, the sale ends (the server refuses a "sale" that isn't one).
 */
export function bulkPrices(
  dishes: readonly Priced[],
  percent: number,
  step: number,
): PriceUpdate[] {
  return dishes.flatMap((dish) => {
    const pricePesewas = changePrice(dish.pricePesewas, percent, step);
    if (pricePesewas === dish.pricePesewas) return [];
    const sale =
      dish.salePricePesewas == null ? null : changePrice(dish.salePricePesewas, percent, step);
    return [
      {
        id: dish.id,
        pricePesewas,
        salePricePesewas: sale !== null && sale < pricePesewas ? sale : null,
      },
    ];
  });
}
