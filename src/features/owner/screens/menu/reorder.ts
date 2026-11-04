type Positioned = { id: string; position: number };

/** Sections in the order guests see them. Ties keep the order the server sent. */
export function sortSections<T extends Positioned>(sections: readonly T[]): T[] {
  return sections
    .map((section, index) => ({ section, index }))
    .sort((a, b) => a.section.position - b.section.position || a.index - b.index)
    .map(({ section }) => section);
}

/**
 * Moves one section up or down and returns the position updates to send.
 * Positions are renumbered 0..n-1 first, so old gaps or duplicates get fixed on the way;
 * only sections whose position actually changes are returned.
 */
export function moveSection(
  sections: readonly Positioned[],
  id: string,
  direction: 'up' | 'down',
): Positioned[] {
  const ordered = sortSections(sections);
  const from = ordered.findIndex((s) => s.id === id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ordered.length) return [];
  const next = [...ordered];
  const [moved] = next.splice(from, 1);
  if (!moved) return [];
  next.splice(to, 0, moved);
  return next.flatMap((section, position) =>
    section.position === position ? [] : [{ id: section.id, position }],
  );
}

/**
 * After a drag inside one section: the new position (0..n-1) of each dish that moved.
 * Dishes that end up where they were aren't sent, so a small drag is a small save.
 */
export function dishPositions(
  dishes: readonly { id: string; position?: number }[],
  orderedIds: readonly string[],
): Positioned[] {
  const before = new Map(dishes.map((dish) => [dish.id, dish.position]));
  return orderedIds.flatMap((id, position) =>
    before.get(id) === position ? [] : [{ id, position }],
  );
}
