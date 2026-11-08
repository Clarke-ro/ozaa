/**
 * Splits tickets into rows of `columns`. The last row is padded with null so its cards keep the
 * same width as the cards above them instead of stretching across the gap.
 */
export function gridRows<T>(items: readonly T[], columns: number): (T | null)[][] {
  const size = Math.max(1, Math.floor(columns));
  const rows: (T | null)[][] = [];
  for (let start = 0; start < items.length; start += size) {
    const row: (T | null)[] = items.slice(start, start + size);
    while (row.length < size) row.push(null);
    rows.push(row);
  }
  return rows;
}
