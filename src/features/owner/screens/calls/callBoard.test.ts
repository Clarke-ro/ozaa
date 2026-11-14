import type { WaiterCall } from '@/lib/api/types';
import { callBoard, callTimes, reasonCounts, topReason } from './callBoard';

const call = (
  id: string,
  status: WaiterCall['status'],
  createdAt: string,
  reason: WaiterCall['reason'] = 'water',
): WaiterCall => ({ id, tableCode: '1', reason, status, createdAt });

describe('callBoard', () => {
  const calls = [
    call('late', 'open', '2026-11-09T10:00:00Z'),
    call('early', 'open', '2026-11-09T09:00:00Z'),
    call('coming', 'acknowledged', '2026-11-09T09:30:00Z'),
    call('doneOld', 'resolved', '2026-11-09T08:00:00Z'),
    call('doneNew', 'resolved', '2026-11-09T11:00:00Z'),
  ];

  it('splits calls into waiting, on the way and done', () => {
    const board = callBoard(calls);
    expect(board.open.map((c) => c.id)).toEqual(['early', 'late']);
    expect(board.acknowledged.map((c) => c.id)).toEqual(['coming']);
    expect(board.resolved.map((c) => c.id)).toEqual(['doneNew', 'doneOld']);
  });

  it('gives three empty columns when nobody has called', () => {
    expect(callBoard([])).toEqual({ open: [], acknowledged: [], resolved: [] });
  });
});

describe('topReason', () => {
  it('finds what guests ask for most', () => {
    expect(
      topReason([
        call('1', 'open', '2026-11-09T10:00:00Z', 'bill'),
        call('2', 'resolved', '2026-11-09T10:01:00Z', 'water'),
        call('3', 'resolved', '2026-11-09T10:02:00Z', 'bill'),
      ]),
    ).toBe('bill');
  });

  it('breaks a tie with the most recent call', () => {
    expect(
      topReason([
        call('1', 'resolved', '2026-11-09T10:00:00Z', 'water'),
        call('2', 'resolved', '2026-11-09T11:00:00Z', 'cutlery'),
      ]),
    ).toBe('cutlery');
  });

  it('gives null with no calls', () => {
    expect(topReason([])).toBeNull();
  });
});

describe('callTimes', () => {
  const base = { createdAt: '2026-11-13T08:00:00Z' };
  it('gives minutes to pick up and to finish', () => {
    expect(
      callTimes({
        ...base,
        acknowledgedAt: '2026-11-13T08:02:00Z',
        resolvedAt: '2026-11-13T08:05:30Z',
      }),
    ).toEqual({ pickedUp: 2, done: 5 });
  });
  it('leaves out what has not happened', () => {
    expect(
      callTimes({ ...base, acknowledgedAt: null, resolvedAt: '2026-11-13T08:01:00Z' }),
    ).toEqual({
      pickedUp: null,
      done: 1,
    });
  });
});

describe('reasonCounts', () => {
  it('counts every reason, zeros included, in the canvas order', () => {
    const counts = reasonCounts([
      { reason: 'water' },
      { reason: 'bill' },
      { reason: 'water' },
    ] as Pick<WaiterCall, 'reason'>[]);
    expect(counts).toEqual([
      { reason: 'water', count: 2 },
      { reason: 'bill', count: 1 },
      { reason: 'cutlery', count: 0 },
      { reason: 'order_more', count: 0 },
      { reason: 'clean_table', count: 0 },
      { reason: 'other', count: 0 },
    ]);
  });
});
