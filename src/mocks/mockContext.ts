import type { TokenSource } from '@/lib/api/client';
import { ApiError, OfflineError } from '@/lib/api/errors';
import { bestPromo } from '@/lib/promos';
import { taxLines } from '@/lib/tax';
import type { AppliedPromo, Menu, Order, OrderLineInput, VenuePublic } from '@/lib/api/types';
import { checkLine, takeStock, unitPrice } from '@/lib/dishRules';
import { createWorld, nextId } from './world';
import type { OrderExtras } from './mockRules';
import { settlePayment } from './mockSettle';

export type MockOptions = {
  latencyMs?: number;
  failRate?: number;
  now?: () => number;
  fast?: boolean;
  random?: () => number;
  tokens?: TokenSource;
};

/** Everything the mock calls share: the in-memory world, the tokens, the clock and the order rules. */
export type MockContext = ReturnType<typeof createMockContext>;

export function createMockContext(options: MockOptions = {}) {
  const now = options.now ?? (() => Date.now());
  const world = createWorld(now());
  const tokens = options.tokens ?? { guest: () => null, access: () => null };
  const latencyMs = options.latencyMs ?? 0;
  const failRate = options.failRate ?? 0;
  const random = options.random ?? Math.random;
  const fast = options.fast ?? false;

  async function gate(): Promise<void> {
    if (random() < failRate) throw new OfflineError();
    if (latencyMs > 0) {
      const wait = latencyMs * (0.5 + random());
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }

  /**
   * Prices an order from the menu, checks stock and limits, takes the stock, and records it.
   * Guest orders and staff orders both come through here, so the money rules can't drift apart.
   * `manual` keeps a ticket where staff put it instead of moving itself along.
   */
  function placeOrder(
    venue: VenuePublic,
    menu: Menu,
    body: { lines: OrderLineInput[]; promoCode?: string },
    tableCode: string | null,
    manual: boolean,
    /** Runs once the food total is known, before any stock is taken; throws to refuse. */
    extras: (foodPesewas: number) => OrderExtras = () => ({ source: 'table' }),
  ): Order {
    // CreateOrderRequest.lines has minItems 1: an empty order would reach the kitchen as a blank ticket.
    if (body.lines.length === 0) {
      throw new ApiError(400, 'validation', 'Add at least one dish');
    }
    const lines = body.lines.map((line) => {
      const item = menu.items.find((candidate) => candidate.id === line.menuItemId);
      if (!item) throw new ApiError(422, 'item_sold_out', 'That dish is not on the menu');
      const check = checkLine(item, line.quantity);
      if (check === 'sold_out') throw new ApiError(422, 'item_sold_out', 'Sold out');
      if (check === 'out_of_range') {
        throw new ApiError(422, 'quantity_out_of_range', 'Change how many you want of this dish');
      }
      const chosen = line.modifierOptionIds ?? [];
      const modifiers = item.modifierGroups.flatMap((group) =>
        group.options
          .filter((option) => chosen.includes(option.id))
          .map((option) => ({ name: option.name.en, pricePesewas: option.pricePesewas })),
      );
      const extra = modifiers.reduce((sum, option) => sum + option.pricePesewas, 0);
      // The sale price, when there is one, is what the guest pays (dishRules.unitPrice).
      const unit = unitPrice(item);
      const total = (unit + extra) * line.quantity;
      return {
        id: nextId(world, 'oln'),
        menuItemId: item.id,
        name: item.name.en,
        quantity: line.quantity,
        modifiers,
        unitPricePesewas: unit,
        totalPesewas: total,
        // Fixed now, so Sales still shows the right discount after the sale ends.
        discountPesewas: (item.pricePesewas - unit) * line.quantity,
        note: line.note,
        paid: false,
      };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.totalPesewas, 0);
    const extra = extras(subtotal);
    const deliveryFee = extra.deliveryFeePesewas ?? 0;
    // Promos: the server picks the one that saves most, before tax and delivery.
    const promos = world.promos.filter((promo) => promo.venueId === venue.id);
    let applied: AppliedPromo | null = null;
    try {
      applied = bestPromo(
        promos,
        {
          lines: lines.map((line) => ({
            ...line,
            categoryId: menu.items.find((item) => item.id === line.menuItemId)?.categoryId ?? null,
          })),
          channel: extra.source === 'table' ? 'table' : 'online',
          code: body.promoCode ?? null,
        },
        now(),
        venue.hours.timezone,
      );
    } catch {
      throw new ApiError(422, 'promo_not_valid', "That code doesn't work right now");
    }
    const afterPromo = subtotal - (applied?.pesewas ?? 0);
    const tax = taxLines(afterPromo, world.tax[venue.id]);
    // Stock: two lines of the same dish count together, and nothing is taken until every line is fine.
    const wanted = new Map<string, number>();
    for (const line of body.lines) {
      wanted.set(line.menuItemId, (wanted.get(line.menuItemId) ?? 0) + line.quantity);
    }
    for (const [id, quantity] of wanted) {
      const item = menu.items.find((candidate) => candidate.id === id);
      if (item?.stockCount != null && quantity > item.stockCount) {
        throw new ApiError(422, 'item_sold_out', 'Not enough left');
      }
    }
    for (const [id, quantity] of wanted) {
      const index = menu.items.findIndex((candidate) => candidate.id === id);
      const item = menu.items[index];
      if (item) menu.items[index] = { ...item, ...takeStock(item, quantity) };
    }
    const order: Order = {
      id: nextId(world, 'ord'),
      number: 100 + world.orders.length,
      venueId: venue.id,
      tableCode,
      status: 'received',
      paymentStatus: 'unpaid',
      lines,
      subtotalPesewas: subtotal,
      taxes: tax.lines,
      totalPesewas: afterPromo + tax.addedPesewas + deliveryFee,
      promoDiscounts: applied ? [applied] : [],
      paidPesewas: 0,
      source: extra.source,
      contact: extra.contact ?? null,
      deliveryAddress: extra.deliveryAddress ?? null,
      deliveryFeePesewas: deliveryFee,
      etaMinutes: extra.etaMinutes ?? 12,
      createdAt: new Date(now()).toISOString(),
      updatedAt: new Date(now()).toISOString(),
      readyAt: null,
    };
    world.orders.push({ order, receivedAt: now(), manual });
    if (applied) {
      const used = world.promos.find((promo) => promo.id === applied?.promoId);
      if (used) {
        used.usageCount += 1;
        used.discountGivenPesewas = (used.discountGivenPesewas ?? 0) + applied.pesewas;
      }
    }
    return order;
  }

  function remember<T>(key: string | undefined, make: () => T): T {
    if (key) {
      const saved = world.idempotency.get(key);
      if (saved) return saved as T;
    }
    const value = make();
    if (key) world.idempotency.set(key, value);
    return value;
  }

  const settle = (reference: string) => settlePayment(world, tokens, now, reference);

  return { world, tokens, now, fast, random, gate, placeOrder, remember, settle };
}
