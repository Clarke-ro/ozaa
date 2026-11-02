export type DayInterval = { opens: string; closes: string };
export type OpeningHours = {
  timezone: string;
  weekly: DayInterval[][];
  exceptions?: { date: string; closed: boolean }[];
};

export type HoursLabel = { open: boolean; text: string };

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function minutes(clock: string): number {
  const [hour, minute] = clock.split(':');
  return Number(hour) * 60 + Number(minute);
}

function clockLabel(clock: string): string {
  const total = minutes(clock);
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  if (minute === 0) return `${hour} ${suffix}`;
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** Accra is UTC+0 all year, so the venue clock matches UTC. */
function accraParts(now: Date): { date: string; weekday: number; minute: number } {
  const iso = now.toISOString();
  const date = iso.slice(0, 10);
  const jsDay = now.getUTCDay();
  const weekday = (jsDay + 6) % 7;
  const minute = now.getUTCHours() * 60 + now.getUTCMinutes();
  return { date, weekday, minute };
}

function nextOpen(hours: OpeningHours, fromWeekday: number, fromMinute: number): string | null {
  for (let offset = 0; offset < 7; offset += 1) {
    const day = (fromWeekday + offset) % 7;
    const intervals = hours.weekly[day] ?? [];
    for (const interval of intervals) {
      const opens = minutes(interval.opens);
      if (offset === 0 && opens <= fromMinute) continue;
      const when = offset === 0 ? clockLabel(interval.opens) : `${WEEKDAYS[day]} ${clockLabel(interval.opens)}`;
      return when;
    }
  }
  return null;
}

export function describeHours(hours: OpeningHours, now: Date): HoursLabel {
  const { date, weekday, minute } = accraParts(now);
  const exception = hours.exceptions?.find((item) => item.date === date);
  if (exception?.closed) {
    const opens = nextOpen(hours, (weekday + 1) % 7, -1);
    return { open: false, text: opens ? `Closed · opens ${opens}` : 'Closed' };
  }
  const today = hours.weekly[weekday] ?? [];
  for (const interval of today) {
    const opens = minutes(interval.opens);
    const closes = minutes(interval.closes);
    if (minute >= opens && minute < closes) {
      return { open: true, text: `Open now · until ${clockLabel(interval.closes)}` };
    }
  }
  const opens = nextOpen(hours, weekday, minute);
  return { open: false, text: opens ? `Closed · opens ${opens}` : 'Closed' };
}
