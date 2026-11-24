// Generated from src/lib/channelMenu.ts by scripts/sync-server-shared.mjs. Do not edit here.
import type { Channel, Menu, MenuItem, ModifierGroup, SyncProblem } from './types.ts';
import { isSoldOut, unitPrice } from './dishRules.ts';
import { isCategoryAvailable } from './menuSchedule.ts';

/**
 * What an outside channel gets from the menu (docs/connectors-plan.md section 3). Pure: the
 * connector (BUILD.md 5b.11) turns this into Chowdeck's own shape and sends it.
 * Shared with the server (scripts/sync-server-shared.mjs).
 */

export type ChannelSection = { ref: string; name: string; rank: number };

export type ChannelDish = {
  /** The channel's id for it: the dish id, or `dishId--optionId` for one size of a dish. */
  ref: string;
  itemId: string;
  sectionRef: string;
  name: string;
  description: string;
  pricePesewas: number;
  inStock: boolean;
  rank: number;
  photoUrl: string | null;
  /** True when optional add-ons were left off, so the owner can be told. */
  droppedAddOns: boolean;
};

export type ChannelMenu = {
  sections: ChannelSection[];
  dishes: ChannelDish[];
  problems: SyncProblem[];
};

// Chowdeck is the only outside channel so far; its API takes no add-ons (plan, section 1).
const LABEL = 'Chowdeck';

/**
 * The channel price: raised by the percent to cover the channel's commission, then rounded up
 * to the step (GH₵0.50, say) so prices look normal. 0% leaves the menu price exactly as it is.
 * Integer maths only: pesewas never become fractions.
 */
export function raisePrice(pesewas: number, rule: Channel['priceRule']): number {
  if (rule.percent === 0) return pesewas;
  const raised = Math.ceil((pesewas * (100 + rule.percent)) / 100);
  return Math.ceil(raised / rule.roundToPesewas) * rule.roundToPesewas;
}

type Plan =
  | { kind: 'one'; droppedAddOns: boolean }
  | { kind: 'sizes'; group: ModifierGroup; droppedAddOns: boolean }
  | { kind: 'cannot'; group: ModifierGroup };

/**
 * How a dish fits a channel without add-ons. One required pick-one group (sizes) becomes one dish
 * per option. Any other required choice can't be shown, so the dish isn't sent. Optional groups
 * are simply left off: the dish can still be ordered without them.
 */
function planFor(dish: MenuItem): Plan {
  const required = dish.modifierGroups.filter((g) => g.min > 0);
  const droppedAddOns = dish.modifierGroups.some((g) => g.min === 0);
  if (required.length === 0) return { kind: 'one', droppedAddOns };
  const [first, second] = required;
  if (required.length === 1 && first!.min === 1 && first!.max === 1)
    return { kind: 'sizes', group: first!, droppedAddOns };
  const blocking = first!.max === 1 && first!.min === 1 ? second! : first!;
  return { kind: 'cannot', group: blocking };
}

const byOwnerOrder = (a: MenuItem, b: MenuItem) =>
  (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER);

export function channelMenu(
  menu: Pick<Menu, 'categories' | 'items'>,
  channel: Pick<Channel, 'priceRule' | 'hiddenItemIds'>,
  now: number,
): ChannelMenu {
  const left = new Set(channel.hiddenItemIds);
  // Food first, then drinks, each in the venue's order: the same order guests see.
  const sections = menu.categories
    .filter((c) => !c.hidden)
    .sort((a, b) => (a.kind === b.kind ? a.position - b.position : a.kind === 'food' ? -1 : 1));

  const out: ChannelMenu = { sections: [], dishes: [], problems: [] };
  for (const section of sections) {
    // A section with hours (Brunch 07:00–11:00) is sent all day, out of stock outside them.
    const open = isCategoryAvailable(section.schedule, new Date(now));
    const dishes = menu.items
      .filter((d) => d.categoryId === section.id && !d.hidden && !left.has(d.id))
      .sort(byOwnerOrder);
    let rank = 0;
    for (const dish of dishes) {
      const plan = planFor(dish);
      if (plan.kind === 'cannot') {
        out.problems.push({
          code: 'needs_addons',
          itemId: dish.id,
          message: `${dish.name.en} needs a choice (${plan.group.name.en}) that ${LABEL} can’t show yet, so it isn’t sent.`,
        });
        continue;
      }
      const base = {
        itemId: dish.id,
        sectionRef: section.id,
        description: dish.description.en ?? '',
        inStock: open && !isSoldOut(dish, now),
        rank: rank++,
        photoUrl: dish.photo?.url ?? null,
        droppedAddOns: plan.droppedAddOns,
      };
      const price = unitPrice(dish);
      if (plan.kind === 'one') {
        out.dishes.push({
          ...base,
          ref: dish.id,
          name: dish.name.en,
          pricePesewas: raisePrice(price, channel.priceRule),
        });
      } else {
        for (const option of plan.group.options) {
          out.dishes.push({
            ...base,
            ref: `${dish.id}--${option.id}`,
            name: `${dish.name.en} · ${option.name.en}`,
            pricePesewas: raisePrice(price + option.pricePesewas, channel.priceRule),
          });
        }
      }
    }
    if (rank > 0)
      out.sections.push({ ref: section.id, name: section.name.en, rank: out.sections.length });
  }
  return out;
}
