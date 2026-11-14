/**
 * Put links in a new order (from a drag). Returns only the links whose position changed, with
 * their new sortOrder numbered 0, 1, 2 … so one save puts every link in place.
 */
export function reorderLinks<T extends { id: string; sortOrder: number }>(
  links: readonly T[],
  ids: readonly string[],
): { id: string; sortOrder: number }[] {
  const before = new Map(links.map((link) => [link.id, link.sortOrder]));
  return ids
    .map((id, index) => ({ id, sortOrder: index }))
    .filter((link) => before.has(link.id) && before.get(link.id) !== link.sortOrder);
}

/** A link's address without the scheme, "www." or a trailing slash: mamas.kitchen/reserve. */
export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    return `${u.host.replace(/^www\./, '')}${path}`;
  } catch {
    return url;
  }
}
