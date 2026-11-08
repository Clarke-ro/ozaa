export type DayPart = 'morning' | 'afternoon' | 'evening';

/** Which greeting fits the hour (0 to 23, the device's local time). */
export function dayPart(hour: number): DayPart {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
