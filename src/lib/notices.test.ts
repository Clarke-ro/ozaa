import { isNoticeLive, liveNotices, noticeKey } from './notices';

const now = Date.parse('2026-11-04T12:00:00Z');
const on = { enabled: true, text: 'Kitchen closes at 9 tonight' };

test('a switched-on notice with no times is live', () => {
  expect(isNoticeLive(on, now)).toBe(true);
});

test('a switched-off notice is never live', () => {
  expect(isNoticeLive({ ...on, enabled: false }, now)).toBe(false);
});

test('it shows from startsAt and stops at endsAt', () => {
  expect(isNoticeLive({ ...on, startsAt: '2026-11-04T13:00:00Z' }, now)).toBe(false);
  expect(isNoticeLive({ ...on, startsAt: '2026-11-04T12:00:00Z' }, now)).toBe(true);
  expect(isNoticeLive({ ...on, endsAt: '2026-11-04T12:00:00Z' }, now)).toBe(false);
  expect(isNoticeLive({ ...on, endsAt: '2026-11-04T12:30:00Z' }, now)).toBe(true);
});

test('blank text never shows, even if switched on', () => {
  expect(isNoticeLive({ ...on, text: '  ' }, now)).toBe(false);
});

test('liveNotices keeps only what guests should see right now', () => {
  const live = liveNotices({ banner: on, popup: { ...on, enabled: false } }, now);
  expect(live).toEqual({ banner: on, popup: null });
  expect(liveNotices(undefined, now)).toEqual({ banner: null, popup: null });
});

test('the popup key changes when the owner edits it, so guests see the new one once', () => {
  const first = noticeKey({ ...on, title: 'Tonight' });
  expect(noticeKey({ ...on, title: 'Tonight' })).toBe(first);
  expect(noticeKey({ ...on, title: 'Tomorrow' })).not.toBe(first);
});
