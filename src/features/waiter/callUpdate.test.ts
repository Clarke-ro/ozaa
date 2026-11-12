import { applyCallUpdate, isInQueue } from './callUpdate';

const at = '2026-11-12T10:00:00.000Z';
const now = Date.parse(at);
const open = {
  id: 'c1',
  tableCode: '4',
  reason: 'water' as const,
  status: 'open' as const,
  createdAt: '2026-11-12T09:58:00.000Z',
};

test('on my way acknowledges and shows the staff name', () => {
  const next = applyCallUpdate(open, { status: 'acknowledged' }, 'Kwesi', now);
  expect(next).toMatchObject({
    status: 'acknowledged',
    staffFirstName: 'Kwesi',
    acknowledgedAt: at,
  });
});

test('a reply resolves the call and keeps the words for the guest', () => {
  const next = applyCallUpdate(open, { reply: 'Coming in 2 min' }, 'Ama', now);
  expect(next).toMatchObject({
    status: 'resolved',
    reply: 'Coming in 2 min',
    repliedAt: at,
    resolvedAt: at,
    staffFirstName: 'Ama',
  });
});

test('a snooze hides the call for a while but leaves the status alone', () => {
  const next = applyCallUpdate(open, { snoozeMinutes: 1 }, 'Ama', now);
  expect(next).not.toBeNull();
  expect(next?.status).toBe('open');
  expect(next?.snoozedUntil).toBe('2026-11-12T10:01:00.000Z');
  expect(isInQueue(next!, now)).toBe(false);
  expect(isInQueue(next!, now + 61_000)).toBe(true);
});

test('done resolves; a finished call takes no more moves', () => {
  const done = applyCallUpdate(open, { status: 'resolved' }, 'Ama', now);
  expect(done).toMatchObject({ status: 'resolved', resolvedAt: at });
  expect(applyCallUpdate(done!, { status: 'acknowledged' }, 'Ama', now)).toBeNull();
  expect(applyCallUpdate(done!, { reply: 'Hi' }, 'Ama', now)).toBeNull();
  expect(isInQueue(done!, now)).toBe(false);
});
