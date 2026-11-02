import { generateTableCodes } from '@/features/tables';

// A venue rarely has more than this many tables; a typo like 1–1000 should not create 1000 QR codes.
export const MAX_BATCH = 200;

export type AddMode = 'range' | 'list';

/** Pure: what the form would create, or why it can't. */
export function planTables(
  mode: AddMode,
  input: { start: string; end: string; prefix: string; list: string },
  existing: readonly string[],
): { codes: string[]; error: string | null } {
  let codes: string[];
  if (mode === 'range') {
    const s = Number.parseInt(input.start, 10);
    const e = Number.parseInt(input.end, 10);
    if (Number.isNaN(s) || Number.isNaN(e)) return { codes: [], error: 'ownerTables.errNumbers' };
    if (e < s) return { codes: [], error: 'ownerTables.errOrder' };
    if (e - s + 1 > MAX_BATCH) return { codes: [], error: 'ownerTables.errTooMany' };
    codes = generateTableCodes(s, e, input.prefix.trim() ? `${input.prefix.trim()} ` : '');
  } else {
    codes = [
      ...new Set(
        input.list
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      ),
    ];
  }
  const taken = new Set(existing.map((c) => c.toLowerCase()));
  const fresh = codes.filter((c) => !taken.has(c.toLowerCase()));
  if (codes.length > 0 && fresh.length === 0)
    return { codes: [], error: 'ownerTables.errAllExist' };
  return { codes: fresh, error: null };
}
