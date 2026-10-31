/** The dietary tags a guest can combine. An item must carry every selected tag. */
export const DIET_TAGS = ['vegetarian', 'vegan', 'gluten_free', 'halal'] as const;

export type DietTag = (typeof DIET_TAGS)[number];

export function filterMenuItems<T extends { categoryId: string; dietary: readonly string[] }>(
  items: readonly T[],
  categoryId: string | undefined,
  diets: readonly DietTag[],
): T[] {
  return items.filter((item) => {
    if (item.categoryId !== categoryId) return false;
    return diets.every((tag) => item.dietary.includes(tag));
  });
}
