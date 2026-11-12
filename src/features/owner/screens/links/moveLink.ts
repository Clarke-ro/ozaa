/**
 * Move one link up or down. Returns only the links whose position changed, with their new
 * sortOrder, numbered 0, 1, 2 … in the new order, so one save puts every link in place.
 */
export function moveLink<T extends { id: string; sortOrder: number }>(
  links: readonly T[],
  id: string,
  step: -1 | 1,
): { id: string; sortOrder: number }[] {
  const ordered = [...links].sort((a, b) => a.sortOrder - b.sortOrder);
  const from = ordered.findIndex((link) => link.id === id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= ordered.length) return [];
  const [moved] = ordered.splice(from, 1);
  if (!moved) return [];
  ordered.splice(to, 0, moved);
  return ordered
    .map((link, index) => ({ id: link.id, sortOrder: index, before: link.sortOrder }))
    .filter((link) => link.sortOrder !== link.before)
    .map(({ id: linkId, sortOrder }) => ({ id: linkId, sortOrder }));
}
