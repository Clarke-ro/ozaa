import { daysFrom, weeklyFrom } from './hoursForm';

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
