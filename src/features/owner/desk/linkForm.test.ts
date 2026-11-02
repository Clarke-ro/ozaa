import { checkLink } from './linkForm';

const base = {
  title: 'Book a table',
  url: 'mamas.kitchen/book',
  hasSchedule: false,
  start: '',
  end: '',
};

test('adds https:// to a bare address and trims', () => {
  expect(checkLink({ ...base, url: '  mamas.kitchen/book ' })).toEqual({
    ok: true,
    url: 'https://mamas.kitchen/book',
    startDate: null,
    endDate: null,
  });
});

test('keeps http and https links as they are', () => {
  expect(checkLink({ ...base, url: 'http://x.com' })).toMatchObject({
    ok: true,
    url: 'http://x.com',
  });
});

test('refuses other schemes and junk, and a blank title', () => {
  expect(checkLink({ ...base, url: 'javascript:alert(1)' })).toEqual({ ok: false, field: 'url' });
  expect(checkLink({ ...base, url: 'not a link' })).toEqual({ ok: false, field: 'url' });
  expect(checkLink({ ...base, title: '  ' })).toEqual({ ok: false, field: 'title' });
});

test('a schedule needs real dates with the end on or after the start', () => {
  expect(
    checkLink({ ...base, hasSchedule: true, start: '2026-12-01', end: '2026-12-24' }),
  ).toMatchObject({
    ok: true,
    startDate: '2026-12-01T00:00:00.000Z',
    endDate: '2026-12-24T23:59:59.999Z',
  });
  expect(checkLink({ ...base, hasSchedule: true, start: '2026-12-24', end: '2026-12-01' })).toEqual(
    { ok: false, field: 'end' },
  );
  expect(checkLink({ ...base, hasSchedule: true, start: '24/12/2026', end: '' })).toEqual({
    ok: false,
    field: 'start',
  });
});

test('one open end is fine', () => {
  expect(checkLink({ ...base, hasSchedule: true, start: '', end: '2026-12-24' })).toMatchObject({
    ok: true,
    startDate: null,
  });
});
