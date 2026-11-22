import { useSyncExternalStore } from 'react';

// The browser's "reduce motion" setting, without Reanimated (which the web versions avoid).
const QUERY = '(prefers-reduced-motion: reduce)';
const media = () =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY) : null;
const subscribe = (notify: () => void) => {
  const list = media();
  list?.addEventListener?.('change', notify);
  return () => list?.removeEventListener?.('change', notify);
};
const read = () => media()?.matches ?? false;

/** True when the person asked their device for less motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
