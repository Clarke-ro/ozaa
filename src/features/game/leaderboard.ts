import type { LeaderboardEntry } from '@/lib/api/types';

/** One finished round, as the mock remembers it. `visit` is the guest session it came from. */
export type ScoreRow = {
  runId: string;
  visit: string;
  nickname: string | null;
  score: number;
  at: number;
};

const BOARD_SIZE = 5;

/** Monday 00:00 UTC of the week `now` falls in. Ghana is UTC all year. */
export function weekStart(now: number): number {
  const d = new Date(now);
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - sinceMonday);
}

/**
 * The weekly board, the same way the server builds it: named scores from this week, the best one
 * per nickname, top five. Sample rows (the demo's) are mixed in and marked.
 */
export function weekBoard(
  rows: readonly ScoreRow[],
  now: number,
  samples: readonly { nickname: string; score: number }[] = [],
): LeaderboardEntry[] {
  const since = weekStart(now);
  const best = new Map<string, number>();
  for (const row of rows) {
    if (!row.nickname || row.at < since) continue;
    best.set(row.nickname, Math.max(best.get(row.nickname) ?? 0, row.score));
  }
  return [
    ...[...best].map(([nickname, score]) => ({ nickname, score })),
    ...samples.map((sample) => ({ ...sample, sample: true })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, BOARD_SIZE)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}

/**
 * Saves a round. A round sent again (same runId) may only add a name to an unnamed score from the
 * same visit, which is what Save does after the game ends. The score never changes.
 */
export function saveScore(rows: readonly ScoreRow[], next: ScoreRow): ScoreRow[] {
  const existing = rows.find((row) => row.runId === next.runId);
  if (!existing) return [...rows, next];
  if (existing.nickname || existing.visit !== next.visit || !next.nickname) return [...rows];
  return rows.map((row) => (row === existing ? { ...row, nickname: next.nickname } : row));
}
