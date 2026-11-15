/** The next `count` months from today, as "2026-11", for the closed-day picker. */
export function monthOptions(today: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, 1));
    return d.toISOString().slice(0, 7);
  });
}

/** How many days "2027-02" has (28 here; 29 in a leap year). */
export function daysIn(month: string): number {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
