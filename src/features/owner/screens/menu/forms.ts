import type { ModifierGroup } from '@/lib/api/types';
import { parseMoneyInput } from '@/lib/money';

/** Monday first, the way owners in Ghana read a week. */
export const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// The guest menu checks days with Date.getUTCDay(): Sunday is 0, Monday 1 … Saturday 6.
export function dayNumber(day: (typeof WEEK)[number]): number {
  return (WEEK.indexOf(day) + 1) % 7;
}

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;
function time(text: string): string | null {
  const match = TIME.exec(text.trim());
  return match ? `${match[1]!.padStart(2, '0')}:${match[2]}` : null;
}

export type SectionCheck =
  | {
      ok: true;
      name: string;
      schedule: { days: number[]; startTime: string; endTime: string } | undefined;
    }
  | { ok: false; field: 'name' | 'days' | 'start' | 'end' };

export function checkSection(input: {
  name: string;
  scheduled: boolean;
  days: number[];
  start: string;
  end: string;
}): SectionCheck {
  const name = input.name.trim();
  if (!name) return { ok: false, field: 'name' };
  if (!input.scheduled) return { ok: true, name, schedule: undefined };
  if (input.days.length === 0) return { ok: false, field: 'days' };
  const startTime = time(input.start);
  if (!startTime) return { ok: false, field: 'start' };
  const endTime = time(input.end);
  if (!endTime || endTime <= startTime) return { ok: false, field: 'end' };
  return { ok: true, name, schedule: { days: [...input.days].sort(), startTime, endTime } };
}

export type DishCheck =
  | { ok: true; name: string; pricePesewas: number }
  | { ok: false; field: 'name' | 'section' | 'price' | 'addOns' };

export function checkDish(input: {
  name: string;
  price: string;
  categoryId: string;
  groups: ModifierGroup[];
}): DishCheck {
  const name = input.name.trim();
  if (!name) return { ok: false, field: 'name' };
  if (!input.categoryId) return { ok: false, field: 'section' };
  const pricePesewas = parseMoneyInput(input.price);
  if (!pricePesewas || pricePesewas <= 0) return { ok: false, field: 'price' };
  for (const group of input.groups) {
    const options = group.options.filter((o) => o.name.en.trim());
    // A guest must be able to meet the minimum, and the minimum cannot exceed the maximum.
    if (!group.name.en.trim() || options.length === 0 || options.length !== group.options.length)
      return { ok: false, field: 'addOns' };
    if (group.min < 0 || group.max < 1 || group.min > group.max || group.min > options.length)
      return { ok: false, field: 'addOns' };
  }
  return { ok: true, name, pricePesewas };
}
