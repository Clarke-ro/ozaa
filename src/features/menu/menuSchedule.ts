export type ScheduleRule = {
  days?: number[];
  startTime?: string; // 'HH:mm'
  endTime?: string; // 'HH:mm'
};

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/**
 * Checks if a menu category schedule is active at the given time.
 * Days are 0 (Sunday) to 6 (Saturday), following JavaScript's Date.getDay().
 */
export function isCategoryAvailable(schedule?: ScheduleRule, now: Date = new Date()): boolean {
  if (!schedule) return true;
  if (schedule.days && schedule.days.length > 0) {
    const day = now.getUTCDay();
    if (!schedule.days.includes(day)) return false;
  }

  if (schedule.startTime && schedule.endTime) {
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const currentMinutes = hours * 60 + minutes;

    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);

    if (startH !== undefined && startM !== undefined && endH !== undefined && endM !== undefined) {
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        return false;
      }
    }
  }

  return true;
}

export const isCategoryActiveNow = isCategoryAvailable;

