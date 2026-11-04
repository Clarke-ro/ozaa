import { useEffect, useState } from 'react';
import type { StoreNotices } from '@/lib/api/types';
import { liveNotices } from '@/lib/notices';

// Notice times are to the minute, so checking once a minute is enough.
const TICK_MS = 60_000;

/** The banner and popup to show now. Re-checks each minute, so a notice ends on time on a page left open. */
export function useLiveNotices(notices: StoreNotices | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return liveNotices(notices, now);
}
