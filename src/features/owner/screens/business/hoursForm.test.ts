import { addClosedDay, daysFrom, hoursOn, isDate, weeklyFrom } from './hoursForm';

test('a day with no slots is closed; one slot is kept', () => {
  const days = daysFrom({
    timezone: 'Africa/Accra',
    weekly: [[{ opens: '11:00', closes: '22:00' }], [], [], [], [], [], []],
  });
  expect(days[0]).toEqual({ open: true, opens: '11:00', closes: '22:00' });
  expect(days[1]).toEqual({ open: false, opens: '', closes: '' });
});

test('saving checks open days only and names the first bad one', () => {
  const days = daysFrom(undefined);
  days[2] = { open: true, opens: '9am', closes: '22:00' };
  expect(weeklyFrom(days)).toEqual({ ok: false, day: 2 });
  days[2] = { open: true, opens: '09:00', closes: '22:00' };
  const result = weeklyFrom(days);
  expect(result.ok && result.weekly[2]).toEqual([{ opens: '09:00', closes: '22:00' }]);
  expect(result.ok && result.weekly[0]).toEqual([]);
});

describe('closed days', () => {
  it('rejects dates that are not on the calendar', () => {
    expect(isDate('2026-02-30')).toBe(false);
    expect(isDate('25/12/2026')).toBe(false);
    expect(isDate('2026-12-25')).toBe(true);
  });
  it('adds a day in date order and never twice', () => {
    const one = addClosedDay([{ date: '2027-01-01', closed: true }], '2026-12-25');
    expect(one?.map((c) => c.date)).toEqual(['2026-12-25', '2027-01-01']);
    expect(addClosedDay(one ?? [], '2026-12-25')).toHaveLength(2);
    expect(addClosedDay([], 'soon')).toBeNull();
  });
  it('keeps a name and, for a day that opens, its own hours', () => {
    const list = addClosedDay([], '2027-01-01', {
      name: " New Year's Day ",
      hours: { opens: '14:00', closes: '22:00' },
    });
    expect(list).toEqual([
      {
        date: '2027-01-01',
        closed: false,
        name: "New Year's Day",
        opens: '14:00',
        closes: '22:00',
      },
    ]);
  });
  it('refuses own hours that close before they open', () => {
    expect(
      addClosedDay([], '2027-01-01', { hours: { opens: '22:00', closes: '14:00' } }),
    ).toBeNull();
  });
});

describe('hoursOn', () => {
  const week = Array.from({ length: 7 }, (_, i) =>
    i === 6 ? [] : [{ opens: '11:00', closes: '22:00' }],
  );
  const hours = { timezone: 'Africa/Accra', weekly: week };
  it('reads Monday as day 0', () => {
    expect(hoursOn(hours, new Date(2026, 10, 9))).toBe('11:00 to 22:00'); // a Monday
  });
  it('gives null on a closed day', () => {
    expect(hoursOn(hours, new Date(2026, 10, 15))).toBeNull(); // a Sunday
  });
});
