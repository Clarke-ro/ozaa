import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarDay } from '../shared/daySummary.ts';
import { zonedMidnight } from './zonedDay.ts';

test('midnight in a zone is the start of that calendar day', () => {
  const cases: [string, string][] = [
    ['2026-11-16', 'Africa/Accra'],
    ['2026-07-15', 'America/New_York'],
    ['2026-11-02', 'America/New_York'],
    ['2026-01-15', 'Pacific/Auckland'],
  ];
  for (const [day, zone] of cases) {
    const start = zonedMidnight(day, zone);
    assert.equal(calendarDay(new Date(start).toISOString(), zone), day, zone);
    assert.notEqual(calendarDay(new Date(start - 1).toISOString(), zone), day, zone);
  }
});
