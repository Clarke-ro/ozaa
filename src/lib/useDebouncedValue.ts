import { useEffect, useState } from 'react';

/** Long enough to skip the letters in the middle of a word, short enough to feel instant. */
export const TYPING_PAUSE_MS = 300;

/**
 * The value once it has stopped changing for `delayMs`. Search boxes use it so typing
 * "Kofi" sends one request, not four, and leaves one cache entry, not four.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = TYPING_PAUSE_MS): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return settled;
}
