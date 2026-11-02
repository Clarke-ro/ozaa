type Dish = { id: string; categoryId: string };

export type MenuRow<T extends Dish> =
  | { type: 'heading'; key: string; title: string }
  | { type: 'dish'; key: string; item: T }
  | { type: 'grid'; key: string; items: T[] };

/**
 * The rows the menu list draws. Grouped (every section on screen) adds a heading per section in
 * menu order and skips empty ones. List view gives one row per dish; grid view chunks each
 * section into rows of `columns` cards.
 */
export function menuRows<T extends Dish>(
  items: readonly T[],
  sections: readonly { id: string; name: { en: string } }[],
  opts: { grouped: boolean; view: 'list' | 'grid'; columns: number },
): MenuRow<T>[] {
  const groups = opts.grouped
    ? sections
        .map((s) => ({
          id: s.id,
          title: s.name.en,
          items: items.filter((i) => i.categoryId === s.id),
        }))
        .filter((g) => g.items.length > 0)
    : [{ id: 'shown', title: null as string | null, items: [...items] }];

  const rows: MenuRow<T>[] = [];
  for (const group of groups) {
    if (group.title !== null)
      rows.push({ type: 'heading', key: `h-${group.id}`, title: group.title });
    if (opts.view === 'list') {
      for (const item of group.items) rows.push({ type: 'dish', key: item.id, item });
    } else {
      for (let i = 0; i < group.items.length; i += opts.columns) {
        const chunk = group.items.slice(i, i + opts.columns);
        rows.push({ type: 'grid', key: chunk.map((c) => c.id).join('|'), items: chunk });
      }
    }
  }
  return rows;
}
