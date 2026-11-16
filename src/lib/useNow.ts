import { useEffect, useState } from 'react';

/**
 * The time now, re-read every `everyMs`, for labels like "4 min ago" and waiting timers.
 * The interval is cleared when the screen closes, so nothing ticks in the background.
 */
export function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
