import type { WaiterCall } from '@/lib/api/types';
import { callBoard, topReason } from './callBoard';

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
