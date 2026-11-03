export type TagResult =
  | { kind: 'custom'; next: string[] }
  | { kind: 'known'; id: string }
  | { kind: 'error'; reason: 'empty' | 'duplicate' | 'long' | 'full' };

/**
 * Turn what the owner typed into a tag. If it names a standard tag ("vegan"), use that one so the
 * guest filters still find the dish; otherwise add it as a custom tag. Duplicates are matched
 * ignoring case, so "Keto" and "keto" never both appear.
 */
export function addTag(
  raw: string,
  opts: {
    custom: readonly string[];
    known: readonly { id: string; label: string }[];
    max: number;
    maxLength: number;
  },
): TagResult {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return { kind: 'error', reason: 'empty' };
  const key = text.toLowerCase();
  const match = opts.known.find((k) => k.label.toLowerCase() === key || k.id === key);
  if (match) return { kind: 'known', id: match.id };
  if (opts.custom.some((c) => c.toLowerCase() === key))
    return { kind: 'error', reason: 'duplicate' };
  if (text.length > opts.maxLength) return { kind: 'error', reason: 'long' };
  if (opts.custom.length >= opts.max) return { kind: 'error', reason: 'full' };
  return { kind: 'custom', next: [...opts.custom, text] };
}
