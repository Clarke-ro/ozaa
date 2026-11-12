import type { Order, PaymentMethodUsed } from '@/lib/api/types';
import type { World } from './worldTypes';
import { STAFF } from './demo';

const DAY = 86_400_000;
const METHODS: PaymentMethodUsed[] = [
  'online_momo',
  'cash',
  'online_card',
  'momo_merchant',
  'card_machine',
];

/** A small repeatable number from a seed, so every test run builds the same history. */
function pick(seed: number, max: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return Math.floor((x - Math.floor(x)) * max);
}

/**
 * Thirty days of finished, paid orders and guest visits for Mama's Kitchen. Sales, Insights,
 * Today's "vs yesterday" and the visit funnel all read these same records, so they agree.
 * A venue without this seed starts at zero, like a brand-new venue would.
 */
export function seedHistory(world: World, now: number): void {
  const venue = world.venues['mamas-kitchen'];
  const menu = world.menus['mamas-kitchen'];
  if (!venue || !menu) return;
  const dishes = menu.items.filter((item) => !item.hidden);
  if (dishes.length === 0) return;
  const staff = STAFF.filter((person) => person.slug === venue.slug && person.role !== 'kitchen');
  const startOfToday = now - (now % DAY);

  for (let day = 1; day <= 30; day += 1) {
    const orders = 6 + pick(day, 9);
    for (let n = 0; n < orders; n += 1) {
      const seed = day * 100 + n;
      const at =
        startOfToday - day * DAY + (11 + pick(seed, 11)) * 3_600_000 + pick(seed + 7, 60) * 60_000;
      const lines: Order['lines'] = [];
      for (let l = 0; l <= pick(seed + 3, 3); l += 1) {
        const dish = dishes[pick(seed + l * 13, dishes.length)];
        if (!dish) continue;
        const quantity = 1 + pick(seed + l, 2);
        const unit = dish.salePricePesewas ?? dish.pricePesewas;
        lines.push({
          id: `oln_h${seed}_${l}`,
          menuItemId: dish.id,
          name: dish.name.en ?? '',
          quantity,
          modifiers: [],
          unitPricePesewas: unit,
          totalPesewas: unit * quantity,
          paid: true,
        });
      }
      const total = lines.reduce((sum, line) => sum + line.totalPesewas, 0);
      const iso = new Date(at).toISOString();
      const servedAt = new Date(at + 35 * 60_000).toISOString();
      const person = staff[pick(seed + 5, staff.length)];
      const table = String(1 + pick(seed + 9, 12));
      world.orders.push({
        manual: true,
        receivedAt: at,
        handledBy: person
          ? {
              staffId: `stf_${person.phone.slice(-4)}`,
              firstName: person.firstName,
              role: person.role,
            }
          : undefined,
        order: {
          id: `ord_h${seed}`,
          number: 1 + n,
          venueId: venue.id,
          tableCode: table,
          status: 'served',
          paymentStatus: 'paid',
          paymentMethod: METHODS[pick(seed + 11, METHODS.length)] ?? 'cash',
          source: 'table',
          lines,
          subtotalPesewas: total,
          taxes: [],
          totalPesewas: total,
          paidPesewas: total,
          createdAt: iso,
          updatedAt: servedAt,
          readyAt: new Date(at + 25 * 60_000).toISOString(),
          servedAt,
        },
      });
      // The guest's visit: scanned, opened the menu, ordered.
      world.sessions.set(`gst_hist_${seed}`, {
        slug: venue.slug,
        tableCode: table,
        orderId: `ord_h${seed}`,
        startedAt: new Date(at - 4 * 60_000).toISOString(),
        menuOpenedAt: new Date(at - 3 * 60_000).toISOString(),
        orderedAt: iso,
      });
    }
    // Visits that didn't order: some only scanned, some looked at the menu and left.
    const browsers = 4 + pick(day + 500, 8);
    for (let b = 0; b < browsers; b += 1) {
      const seed = day * 1000 + b;
      const at = startOfToday - day * DAY + (10 + pick(seed, 12)) * 3_600_000;
      world.sessions.set(`gst_hist_v${seed}`, {
        slug: venue.slug,
        tableCode: String(1 + pick(seed + 9, 12)),
        orderId: null,
        startedAt: new Date(at).toISOString(),
        menuOpenedAt: pick(seed + 1, 3) > 0 ? new Date(at + 60_000).toISOString() : undefined,
      });
    }
  }

  // Today's orders came from guests too: give each table order its visit, plus a few browsers.
  for (const live of world.orders) {
    const order = live.order;
    if (order.venueId !== venue.id || Date.parse(order.createdAt) < startOfToday) continue;
    world.sessions.set(`gst_today_${order.id}`, {
      slug: venue.slug,
      tableCode: order.tableCode,
      orderId: order.id,
      startedAt: new Date(Date.parse(order.createdAt) - 3 * 60_000).toISOString(),
      menuOpenedAt: new Date(Date.parse(order.createdAt) - 2 * 60_000).toISOString(),
      orderedAt: order.createdAt,
    });
  }
  for (let b = 0; b < 9; b += 1) {
    const at = Math.max(startOfToday, now - (b + 1) * 25 * 60_000);
    world.sessions.set(`gst_today_v${b}`, {
      slug: venue.slug,
      tableCode: String(1 + pick(b + 77, 12)),
      orderId: null,
      startedAt: new Date(at).toISOString(),
      menuOpenedAt: b % 3 === 0 ? undefined : new Date(at + 60_000).toISOString(),
    });
  }
}
