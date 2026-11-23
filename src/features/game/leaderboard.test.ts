import { saveScore, weekBoard, type ScoreRow } from './leaderboard';

const MON = Date.parse('2026-11-23T09:00:00Z');
const row = (
  runId: string,
  score: number,
  nickname: string | null,
  at = MON,
  visit = 'v1',
): ScoreRow => ({
  runId,
  visit,
  nickname,
  score,
  at,
});

describe('weekBoard', () => {
  it('shows this week’s best named score per nickname, top 5, ranked', () => {
    const rows = [
      row('a', 12, 'Kwame'),
      row('b', 20, 'Esi'),
      row('c', 15, 'Kwame'),
      row('d', 30, null), // unnamed: counts for rank only, never shown
      row('e', 50, 'LastWeek', MON - 2 * 86_400_000),
    ];
    expect(weekBoard(rows, MON + 3600_000)).toEqual([
      { rank: 1, nickname: 'Esi', score: 20 },
      { rank: 2, nickname: 'Kwame', score: 15 },
    ]);
  });

  it('mixes in sample rows, marked, and keeps five', () => {
    const samples = [
      { nickname: 'Kofi', score: 25 },
      { nickname: 'Yaw', score: 3 },
      { nickname: 'Abena', score: 2 },
      { nickname: 'Kojo', score: 1 },
      { nickname: 'Efua', score: 0 },
    ];
    const board = weekBoard([row('a', 10, 'Me')], MON, samples);
    expect(board).toHaveLength(5);
    expect(board[0]).toEqual({ rank: 1, nickname: 'Kofi', score: 25, sample: true });
    expect(board[1]).toEqual({ rank: 2, nickname: 'Me', score: 10 });
  });
});

describe('saveScore', () => {
  it('adds a name to the same unnamed round from the same visit, once', () => {
    let rows = saveScore([], row('r1', 18, null));
    rows = saveScore(rows, row('r1', 18, 'Hijack', MON, 'v2'));
    expect(rows[0]!.nickname).toBeNull();
    rows = saveScore(rows, row('r1', 99, 'Adwoa'));
    expect(rows).toEqual([row('r1', 18, 'Adwoa')]);
    rows = saveScore(rows, row('r1', 18, 'Renamed'));
    expect(rows[0]!.nickname).toBe('Adwoa');
  });
});
