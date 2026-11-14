/** One "Name" field into the contract's first and last name: split at the first space. */
export function splitName(full: string): { firstName: string; lastName: string | null } {
  const clean = full.trim().replace(/\s+/g, ' ');
  const at = clean.indexOf(' ');
  if (at < 0) return { firstName: clean, lastName: null };
  return { firstName: clean.slice(0, at), lastName: clean.slice(at + 1) };
}
