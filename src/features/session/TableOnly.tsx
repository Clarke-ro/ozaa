import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useGuestSession } from './sessionStore';

/**
 * Pages for guests at a table they scanned: call the waiter, the game, reviews, Wi-Fi, loyalty,
 * offers. Someone who came from the venue's link (online ordering) is sent to its menu instead,
 * so the two kinds of guest never see each other's pages (Clarke, 2026-11-16).
 */
export function TableOnly({ slug, children }: { slug: string; children: ReactNode }) {
  const hydrated = useGuestSession((state) => state.hydrated);
  const atTable = useGuestSession((state) => state.slug === slug && Boolean(state.tableCode));
  // On phones the saved visit loads a moment after start: wait, so a table guest isn't sent away.
  if (!hydrated) return null;
  if (!atTable) return <Redirect href={`/${slug}`} />;
  return children;
}
