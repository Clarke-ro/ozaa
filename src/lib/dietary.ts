import type { components } from './api/schema';

type Dietary = components['schemas']['Dietary'];

/**
 * The standard diet tags, in display order. One list for the guest filters and the owner's dish
 * editor. `satisfies` keeps it in step with the contract: an unknown tag fails to compile, and
 * the check below fails if the contract adds a tag this list is missing.
 */
export const DIETARY = ['vegetarian', 'vegan', 'gluten_free', 'halal', 'spicy'] as const satisfies readonly Dietary[];
type Missing = Exclude<Dietary, (typeof DIETARY)[number]>;
// If this line errors, add the new contract tag to DIETARY above.
const allTagsListed: Missing extends never ? true : never = true;
void allTagsListed;

/**
 * The diet choices to offer on this menu: only tags that at least one dish carries, so a guest
 * never filters to an empty page. Standard tags come first in DIETARY order, then tags the venue
 * typed in, A to Z, with "Keto" and "keto" counted once.
 */
export function dietOptions(
  items: readonly { dietary: readonly string[]; dietaryCustom?: readonly string[] }[],
): string[] {
  const standard = DIETARY.filter((tag) => items.some((i) => i.dietary.includes(tag)));
  const custom = new Map<string, string>();
  for (const item of items) {
    for (const tag of item.dietaryCustom ?? []) {
      const key = tag.toLowerCase();
      if (!custom.has(key)) custom.set(key, tag);
    }
  }
  return [...standard, ...[...custom.values()].sort((a, b) => a.localeCompare(b))];
}
