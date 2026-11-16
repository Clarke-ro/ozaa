/**
 * Where "home" is for a guest. A table guest's home is their table's page (/slug/t/12), with
 * the services list; the venue's own link (/slug) is the online-ordering menu. Keeping them apart
 * means a table guest never lands on online ordering, and a link customer never on a table.
 */
export function guestHomeHref(slug: string, tableCode: string | null): `/${string}` {
  return tableCode ? `/${slug}/t/${encodeURIComponent(tableCode)}` : `/${slug}`;
}
