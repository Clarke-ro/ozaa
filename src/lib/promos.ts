import type { AppliedPromo, Promo, PromoInput } from '@/lib/api/types';

/** What the rules read from a promo: its settings plus how often it was used. */
export type PromoRule = PromoInput & { id: string; usageCount: number };
export type PromoLine = {
  menuItemId: string;
  categoryId: string | null;
  quantity: number;
  unitPricePesewas: number;
  totalPesewas: number;
};
export type PromoOrder = {
  lines: readonly PromoLine[];
  channel: 'table' | 'online';
  code: string | null;
};

/** running, scheduled, ended or off, worked out now. The daily window doesn't change it. */
export function promoState(rule: PromoRule, now: number): Promo['state'] {
  if (!rule.enabled) return 'off';
  if (rule.endsAt && Date.parse(rule.endsAt) <= now) return 'ended';
  if (rule.usageLimit != null && rule.usageCount >= rule.usageLimit) return 'ended';
  if (rule.startsAt && Date.parse(rule.startsAt) > now) return 'scheduled';
  return 'running';
}

/** Day of week (0 is Monday) and "HH:MM" on the venue's clock. */
function venueClock(now: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(now));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
  return { day, time: `${get('hour')}:${get('minute')}` };
}

/** Inside the daily window. A window like 22:00 to 02:00 runs past midnight. */
function inWindow(time: string, start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return true;
  return start <= end ? time >= start && time < end : time >= start || time < end;
}

/** How much this promo takes off this order, or 0 when it doesn't apply. */
function discountOf(rule: PromoRule, order: PromoOrder): number {
  const subtotal = order.lines.reduce((sum, line) => sum + line.totalPesewas, 0);
  if (rule.minSpendPesewas != null && subtotal < rule.minSpendPesewas) return 0;
  const lines =
    rule.appliesTo === 'category'
      ? order.lines.filter((line) => line.categoryId === rule.categoryId)
      : order.lines;
  const base = lines.reduce((sum, line) => sum + line.totalPesewas, 0);
  // Round down so the venue never gives away a part pesewa.
  if (rule.kind === 'percent_off') return Math.floor((base * (rule.percent ?? 0)) / 100);
  if (rule.kind === 'amount_off') return Math.min(base, rule.amountPesewas ?? 0);
  const free = order.lines.find((line) => line.menuItemId === rule.freeItemId);
  return free ? free.unitPricePesewas : 0;
}

/**
 * The one promo the server applies to a bill: running now, open today and at this hour,
 * for this channel, above the minimum, and with the code if it needs one. The biggest wins;
 * promos never stack. A code the guest typed that fits nothing throws promo_not_valid.
 */
export function bestPromo(
  rules: readonly PromoRule[],
  order: PromoOrder,
  now: number,
  timeZone: string,
): AppliedPromo | null {
  const clock = venueClock(now, timeZone);
  let best: AppliedPromo | null = null;
  let codeMatched = false;
  for (const rule of rules) {
    if (promoState(rule, now) !== 'running') continue;
    if (rule.channel !== 'all' && rule.channel !== order.channel) continue;
    if (rule.days && rule.days.length > 0 && !rule.days.includes(clock.day)) continue;
    if (!inWindow(clock.time, rule.startTime, rule.endTime)) continue;
    if (rule.code && rule.code !== order.code) continue;
    if (rule.code) codeMatched = true;
    const pesewas = discountOf(rule, order);
    if (pesewas > 0 && (!best || pesewas > best.pesewas)) {
      best = { promoId: rule.id, name: rule.name, pesewas };
    }
  }
  if (order.code && !codeMatched) throw new Error('promo_not_valid');
  return best;
}
