/** Where a row dragged `dy` pixels from index `from` would land, kept inside the list. */
export function dropIndex(from: number, dy: number, step: number, count: number): number {
  return Math.max(0, Math.min(count - 1, from + Math.round(dy / step)));
}

/** The list with one item moved from `from` to `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item === undefined) return [...list];
  next.splice(to, 0, item);
  return next;
}

/** How far a resting row slides while another is dragged from `from` towards `to`. */
export function shiftFor(index: number, from: number, to: number, step: number): number {
  if (from < to && index > from && index <= to) return -step;
  if (from > to && index < from && index >= to) return step;
  return 0;
}
