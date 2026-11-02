/**
 * Dishes in a section (or every section for 'all') that carry every chosen diet tag. Tags can be
 * standard ones (dietary) or ones the venue typed in (dietaryCustom), matched ignoring case.
 */
export function filterMenuItems<
  T extends { categoryId: string; dietary: readonly string[]; dietaryCustom?: readonly string[] },
>(items: readonly T[], categoryId: string | undefined, diets: readonly string[]): T[] {
  return items.filter((item) => {
    if (categoryId !== 'all' && item.categoryId !== categoryId) return false;
    const tags = [...item.dietary, ...(item.dietaryCustom ?? [])].map((t) => t.toLowerCase());
    return diets.every((tag) => tags.includes(tag.toLowerCase()));
  });
}
