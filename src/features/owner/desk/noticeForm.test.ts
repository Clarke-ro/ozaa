import {
  checkNotice,
  dayOptions,
  draftOf,
  formatWhen,
  parseWhen,
  timeOptions,
  whenLabel,
} from './noticeForm';

// Times are typed in the phone's own time zone; tests pin it to Accra (UTC, no DST).
const tz = 'Africa/Accra';

describe('parseWhen and formatWhen', () => {
  test('blank means no time', () => {
    expect(parseWhen('  ', tz)).toEqual({ ok: true, iso: null });
  });
  test('"2026-11-04 18:30" becomes an ISO time and back', () => {
    const parsed = parseWhen('2026-11-04 18:30', tz);
    expect(parsed).toEqual({ ok: true, iso: '2026-11-04T18:30:00.000Z' });
    expect(formatWhen('2026-11-04T18:30:00.000Z', tz)).toBe('2026-11-04 18:30');
  });
  test('anything else is refused', () => {
    expect(parseWhen('tomorrow', tz).ok).toBe(false);
    expect(parseWhen('2026-13-01 10:00', tz).ok).toBe(false);
    expect(parseWhen('2026-11-04 25:00', tz).ok).toBe(false);
  });
});

describe('checkNotice', () => {
  const base = { enabled: true, title: '', text: 'Kitchen closes at 9', starts: '', ends: '' };

  test('a simple notice with no times is fine', () => {
    expect(checkNotice(base, tz)).toEqual({
      ok: true,
      notice: { enabled: true, text: 'Kitchen closes at 9', startsAt: null, endsAt: null },
    });
  });
  test('the popup title is kept when typed, and trimmed', () => {
    const check = checkNotice({ ...base, title: '  Tonight ' }, tz);
    expect(check.ok && check.notice?.title).toBe('Tonight');
  });
  test('a notice switched on needs words; one switched off may be empty', () => {
    expect(checkNotice({ ...base, text: ' ' }, tz)).toEqual({ ok: false, field: 'text' });
    expect(checkNotice({ ...base, enabled: false, text: '' }, tz)).toEqual({
      ok: true,
      notice: null,
    });
  });
  test('text over 280 characters is refused', () => {
    expect(checkNotice({ ...base, text: 'a'.repeat(281) }, tz)).toEqual({
      ok: false,
      field: 'text',
    });
  });
  test('bad times are refused, and the end must come after the start', () => {
    expect(checkNotice({ ...base, starts: 'soon' }, tz)).toEqual({ ok: false, field: 'starts' });
    expect(
      checkNotice({ ...base, starts: '2026-11-04 18:00', ends: '2026-11-04 17:00' }, tz),
    ).toEqual({ ok: false, field: 'ends' });
  });
  test('draftOf fills the form from a saved notice', () => {
    expect(
      draftOf({ enabled: true, title: 'T', text: 'Hi', startsAt: '2026-11-04T18:30:00.000Z' }, tz),
    ).toEqual({ enabled: true, title: 'T', text: 'Hi', starts: '2026-11-04 18:30', ends: '' });
    expect(draftOf(null, tz)).toEqual({
      enabled: false,
      title: '',
      text: '',
      starts: '',
      ends: '',
    });
  });
});

test('a venue in a zone with summer time gets the right moment', () => {
  // London is UTC+1 in July, so 18:00 there is 17:00 UTC.
  expect(parseWhen('2026-07-01 18:00', 'Europe/London')).toEqual({
    ok: true,
    iso: '2026-07-01T17:00:00.000Z',
  });
  expect(formatWhen('2026-07-01T17:00:00.000Z', 'Europe/London')).toBe('2026-07-01 18:00');
});

test('a date that does not exist is refused', () => {
  expect(parseWhen('2026-02-31 10:00', 'Africa/Accra').ok).toBe(false);
});

describe('picking times instead of typing them', () => {
  // 10:15 in Accra (UTC+0) on Saturday 14 November 2026.
  const now = Date.UTC(2026, 10, 14, 10, 15);
  it('offers today and the next days in the venue zone', () => {
    const days = dayOptions(now, 'Africa/Accra', 3);
    expect(days).toEqual(['2026-11-14', '2026-11-15', '2026-11-16']);
  });
  it('uses the venue zone, not the phone, to decide what today is', () => {
    // 23:30 UTC is already the next day in Nairobi (UTC+3).
    expect(dayOptions(Date.UTC(2026, 10, 14, 23, 30), 'Africa/Nairobi', 1)).toEqual(['2026-11-15']);
  });
  it('labels Today and Tomorrow, then the date', () => {
    const words = { today: 'Today', tomorrow: 'Tomorrow' };
    expect(whenLabel('2026-11-14 18:00', now, 'Africa/Accra', words, 'en')).toBe('Today, 18:00');
    expect(whenLabel('2026-11-15 09:30', now, 'Africa/Accra', words, 'en')).toBe('Tomorrow, 09:30');
    expect(whenLabel('2026-11-20 12:00', now, 'Africa/Accra', words, 'en')).toMatch(
      /Fri.*20.*Nov.*12:00/,
    );
    expect(whenLabel('', now, 'Africa/Accra', words, 'en')).toBe('');
  });
  it('offers every half hour of the day', () => {
    const times = timeOptions();
    expect(times).toHaveLength(48);
    expect(times[0]).toBe('00:00');
    expect(times[37]).toBe('18:30');
  });
});
