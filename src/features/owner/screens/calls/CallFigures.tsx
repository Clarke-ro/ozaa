import { useTranslation } from 'react-i18next';
import { CardGrid, FigureCard } from '../../kit';

/**
 * The three numbers at the top of Calls as white figure cards: waiting now, on the way, and how
 * fast calls are picked up. Three across on wide screens; on phones the third wraps under.
 */
export function CallFigures({
  waiting,
  coming,
  avg,
  wide,
}: {
  waiting: number;
  coming: number;
  /** Average minutes to pick up a call, or null with none picked up yet. */
  avg: number | null;
  wide: boolean;
}) {
  const { t } = useTranslation();
  return (
    <CardGrid columns={wide ? 3 : 2}>
      <FigureCard
        order="labelFirst"
        label={t('ownerCalls.status.open')}
        value={String(waiting)}
        note={waiting > 0 ? t('ownerCalls.answerSoon') : undefined}
      />
      <FigureCard
        order="labelFirst"
        label={t('ownerCalls.status.acknowledged')}
        value={String(coming)}
      />
      <FigureCard
        order="labelFirst"
        label={t('ownerCalls.avgShort')}
        value={avg == null ? '–' : t('ownerCalls.minutes', { count: avg })}
      />
    </CardGrid>
  );
}
