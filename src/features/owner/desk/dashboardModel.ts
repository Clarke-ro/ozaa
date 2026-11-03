import type { InsightsReport, OwnerDashboard } from '@/lib/api/types';

export type DashboardLike = Pick<OwnerDashboard, 'changePercent' | 'direction'>;

export type SalesLine = {
  key: 'owner.made' | 'owner.madeUp' | 'owner.madeDown';
  percent: number | null;
  tone: 'up' | 'down' | 'flat';
};

/** Which sentence goes under today's sales. With no comparison from the server, say only the amount. */
export function salesLine(d: DashboardLike): SalesLine {
  const pct = d.changePercent;
  if (pct == null || pct === 0 || d.direction === 'none' || d.direction === 'flat') {
    return { key: 'owner.made', percent: null, tone: 'flat' };
  }
  return d.direction === 'down' || pct < 0
    ? { key: 'owner.madeDown', percent: Math.abs(pct), tone: 'down' }
    : { key: 'owner.madeUp', percent: Math.abs(pct), tone: 'up' };
}

export type InsightTileId =
  'scans' | 'menuViews' | 'enrolled' | 'active' | 'rewardReady' | 'redeemed';

/** The insight tiles the server actually sent. A missing number is left out, never filled in. */
export function insightTiles(
  report: Pick<InsightsReport, 'scansCount' | 'menuViewsCount' | 'loyaltyMetrics'> | undefined,
): { id: InsightTileId; value: number }[] {
  if (!report) return [];
  const loyalty = report.loyaltyMetrics ?? {};
  const all: [InsightTileId, number | undefined][] = [
    ['scans', report.scansCount],
    ['menuViews', report.menuViewsCount],
    ['enrolled', loyalty.enrolled],
    ['active', loyalty.active],
    ['rewardReady', loyalty.rewardReady],
    ['redeemed', loyalty.redeemed],
  ];
  return all.flatMap(([id, value]) => (typeof value === 'number' ? [{ id, value }] : []));
}

/**
 * Sums consecutive points so a 30- or 90-day series fits in a few readable bars.
 * Each bar is labelled with the first point it covers. Totals are kept exactly.
 */
export function bucket<T extends { key: string; value: number }>(
  points: T[],
  max: number,
): { key: string; value: number }[] {
  if (points.length <= max) return points.map(({ key, value }) => ({ key, value }));
  const size = Math.ceil(points.length / max);
  const out: { key: string; value: number }[] = [];
  for (let i = 0; i < points.length; i += size) {
    const chunk = points.slice(i, i + size);
    out.push({ key: chunk[0]?.key ?? '', value: chunk.reduce((sum, p) => sum + p.value, 0) });
  }
  return out;
}
