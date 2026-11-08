import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { InsightsReport } from '@/lib/api/types';
import { insightTiles } from '../../desk/dashboardModel';
import { CardGrid, FigureCard, hourLabel } from '../../kit';

/**
 * Insights' figure cards, two across at every size: scans and menu views, the busiest hour,
 * returning guests, feedback notes, then the loyalty figures (which open Loyalty). A figure
 * the server did not send is left out, never shown as a made-up zero.
 */
export function InsightFigures({
  report: r,
  peak,
  feedback,
}: {
  report: InsightsReport;
  peak: number | null;
  feedback: number;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const n = (v: number) => v.toLocaleString(i18n.language);
  const tiles = insightTiles(r);
  const visits = tiles.filter((tile) => tile.id === 'scans' || tile.id === 'menuViews');
  const loyalty = tiles.filter((tile) => tile.id !== 'scans' && tile.id !== 'menuViews');

  return (
    <CardGrid columns={2}>
      {visits.map((tile) => (
        <FigureCard
          key={tile.id}
          order="valueFirst"
          label={t(`ownerDash.tiles.${tile.id}`)}
          value={n(tile.value)}
        />
      ))}
      {peak != null ? (
        <FigureCard order="valueFirst" label={t('ownerInsights.busiest')} value={hourLabel(peak)} />
      ) : null}
      <FigureCard
        order="valueFirst"
        label={t('ownerInsights.guests')}
        value={`${r.repeatGuests.sharePercent}%`}
      />
      <FigureCard order="valueFirst" label={t('ownerInsights.feedbackCount')} value={n(feedback)} />
      {loyalty.map((tile) => (
        <FigureCard
          key={tile.id}
          order="valueFirst"
          label={t(`ownerDash.tiles.${tile.id}`)}
          value={n(tile.value)}
          onPress={() => router.push('/owner/loyalty')}
        />
      ))}
    </CardGrid>
  );
}
