import type { QueryKey, QueryStatus } from '@tanstack/react-query';

/**
 * Only the venue and menu are saved to the device, so a guest on bad data still sees the menu
 * (BUILD.md section 11). Owner data and loyalty cards hold names, masked phones and emails,
 * so they stay in memory and go when the tab closes or the owner signs out (Act 843).
 */
const PERSISTED_ROOTS: ReadonlySet<unknown> = new Set(['venue', 'menu']);

/** Every owner cache key starts with this (see features/owner/data/keys.ts). */
const OWNER_PREFIX = 'owner-';

export function shouldPersistQuery(queryKey: QueryKey, status: QueryStatus): boolean {
  return status === 'success' && PERSISTED_ROOTS.has(queryKey[0]);
}

export function isOwnerQuery(queryKey: QueryKey): boolean {
  const root = queryKey[0];
  return typeof root === 'string' && root.startsWith(OWNER_PREFIX);
}
