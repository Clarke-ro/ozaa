/**
 * "Mama's Kitchen - Osu" → "Mama's Kitchen" and "Osu", so the location card shows the venue on
 * one line and the area under it (canvas) instead of cutting the full name short.
 */
export function splitLocationName(name: string): { title: string; area: string | null } {
  const match = /^(.+?)\s+[-–—]\s+(.+)$/.exec(name.trim());
  return match
    ? { title: match[1] ?? name, area: match[2] ?? null }
    : { title: name.trim(), area: null };
}
