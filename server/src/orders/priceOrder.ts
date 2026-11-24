import { randomUUID } from 'node:crypto';
import { Problem } from '../http/problem.ts';
import { checkLine, unitPrice } from '../shared/dishRules.ts';
import { checkFulfilment, onlineOrderingOf } from '../shared/onlineOrdering.ts';
import { bestPromo, type PromoRule } from '../shared/promos.ts';
import { taxLines } from '../shared/tax.ts';
import type {
  AppliedPromo,
  CreateOrderRequest,
  MenuItem,
  Order,
  TaxLine,
  TaxSetup,
  VenuePublic,
} from '../shared/types.ts';

type OrderLine = Order['lines'][number];

export type PricedOrder = {
  lines: OrderLine[];
  subtotalPesewas: number;
  taxes: TaxLine[];
  promoDiscounts: AppliedPromo[];
  deliveryFeePesewas: number;
  totalPesewas: number;
  source: 'table' | 'pickup' | 'delivery';
  contact: { name: string; phone: string } | null;
  deliveryAddress: string | null;
  etaMinutes: number;
  /** How many of each dish this order takes from stock. */
  stock: Map<string, number>;
};

/**
 * Prices an order from the menu: the server's total always wins (AGENTS.md rule 5). The same steps
 * as the demo (src/mocks/mockContext.ts), with the same shared rules: each line checked and priced
 * (sale price, add-ons), the best single promo, tax, then any delivery fee. Nothing is saved here.
 */
export function priceOrder(input: {
  items: MenuItem[];
  venue: VenuePublic;
  promos: PromoRule[];
  tax: TaxSetup | null;
  body: Pick<CreateOrderRequest, 'lines' | 'promoCode' | 'fulfilment'>;
  tableCode: string | null;
  now: number;
  /** Staff taking an order at the counter or by phone: no table and no customer details needed. */
  counter?: boolean;
}): PricedOrder {
  const { items, venue, body, tableCode } = input;
  if (body.lines.length === 0) throw new Problem(400, 'validation', 'Add at least one dish.');

  const lines = body.lines.map((line): OrderLine => {
    const item = items.find((candidate) => candidate.id === line.menuItemId);
    if (!item || item.hidden)
      throw new Problem(422, 'item_sold_out', 'That dish is not on the menu.');
    const check = checkLine(item, line.quantity, input.now);
    if (check === 'sold_out')
      throw new Problem(422, 'item_sold_out', `${item.name.en} is sold out.`);
    if (check === 'out_of_range') {
      throw new Problem(422, 'quantity_out_of_range', `Change how many ${item.name.en} you want.`);
    }
    const chosen = line.modifierOptionIds ?? [];
    const modifiers = item.modifierGroups.flatMap((group) =>
      group.options
        .filter((option) => chosen.includes(option.id))
        .map((option) => ({ name: option.name.en ?? '', pricePesewas: option.pricePesewas })),
    );
    const extra = modifiers.reduce((sum, option) => sum + option.pricePesewas, 0);
    const unit = unitPrice(item);
    return {
      id: `oln_${randomUUID().replaceAll('-', '')}`,
      menuItemId: item.id,
      name: item.name.en ?? '',
      quantity: line.quantity,
      modifiers,
      unitPricePesewas: unit,
      totalPesewas: (unit + extra) * line.quantity,
      // Fixed now, so Sales still shows the right discount after the sale ends.
      discountPesewas: (item.pricePesewas - unit) * line.quantity,
      ...(line.note ? { note: line.note } : {}),
      paid: false,
    };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.totalPesewas, 0);

  // A table order, or a menu-link order with the customer's details and pickup or delivery.
  let online: Omit<
    PricedOrder,
    'lines' | 'subtotalPesewas' | 'taxes' | 'promoDiscounts' | 'totalPesewas' | 'stock'
  >;
  if (tableCode) {
    online = {
      source: 'table',
      contact: null,
      deliveryAddress: null,
      deliveryFeePesewas: 0,
      etaMinutes: 12,
    };
  } else if (input.counter && !body.fulfilment) {
    online = {
      source: 'pickup',
      contact: null,
      deliveryAddress: null,
      deliveryFeePesewas: 0,
      etaMinutes: 15,
    };
  } else {
    if (!body.fulfilment)
      throw new Problem(400, 'missing_contact', 'Add your name and phone number.');
    const pin =
      venue.location.lat != null && venue.location.lng != null
        ? { lat: venue.location.lat, lng: venue.location.lng }
        : null;
    const check = checkFulfilment(
      onlineOrderingOf(venue.onlineOrdering),
      pin,
      body.fulfilment,
      subtotal,
    );
    if (!check.ok) {
      throw new Problem(
        check.code === 'missing_contact' ? 400 : 422,
        check.code,
        'This order cannot be taken.',
      );
    }
    online = {
      source: check.source,
      contact: { name: body.fulfilment.contact.name.trim(), phone: body.fulfilment.contact.phone },
      deliveryAddress:
        check.source === 'delivery' ? (body.fulfilment.address?.trim() ?? null) : null,
      deliveryFeePesewas: check.deliveryFeePesewas,
      etaMinutes: check.etaMinutes,
    };
  }

  let applied: AppliedPromo | null = null;
  try {
    applied = bestPromo(
      input.promos,
      {
        lines: lines.map((line) => ({
          ...line,
          categoryId: items.find((item) => item.id === line.menuItemId)?.categoryId ?? null,
        })),
        channel: online.source === 'table' ? 'table' : 'online',
        code: body.promoCode ?? null,
      },
      input.now,
      venue.hours.timezone,
    );
  } catch {
    throw new Problem(422, 'promo_not_valid', "That code doesn't work right now.");
  }
  const afterPromo = subtotal - (applied?.pesewas ?? 0);
  const tax = taxLines(afterPromo, input.tax);

  // Two lines of the same dish count together against what's left.
  const stock = new Map<string, number>();
  for (const line of body.lines)
    stock.set(line.menuItemId, (stock.get(line.menuItemId) ?? 0) + line.quantity);
  for (const [id, quantity] of stock) {
    const item = items.find((candidate) => candidate.id === id);
    if (item?.stockCount != null && quantity > item.stockCount) {
      throw new Problem(422, 'item_sold_out', `Only ${item.stockCount} ${item.name.en} left.`);
    }
  }

  return {
    lines,
    subtotalPesewas: subtotal,
    taxes: tax.lines,
    promoDiscounts: applied ? [applied] : [],
    totalPesewas: afterPromo + tax.addedPesewas + online.deliveryFeePesewas,
    stock,
    ...online,
  };
}
