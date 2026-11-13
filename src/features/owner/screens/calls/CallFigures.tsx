import { useTranslation } from 'react-i18next';
import type { WaiterCall } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { CardGrid, FigureCard } from '../../kit';

/**
 * The four numbers at the top of Calls: waiting now, on the way, how fast calls are picked up,
 * and what guests ask for most. Four across on a desktop, two by two below that.
 */
export function CallFigures({
  waiting,
  late,
  coming,
  avg,
  top,
  columns,
}: {
  waiting: number;
  /** Waiting calls past 10 minutes. */
  late: number;
  coming: number;
  /** Average minutes to pick up a call, or null with none picked up yet. */
  avg: number | null;
  /** What guests ask for most, or null with no calls. */
  top: WaiterCall['reason'] | null;
  columns: number;
}) {
  const { t } = useTranslation();
  return (
    <CardGrid columns={columns} gap={tokens.owner.controls.listGap}>
      <FigureCard
        order="labelFirst"
        tall
        label={t('ownerCalls.status.open')}
        value={String(waiting)}
        aside={late > 0 ? t('ownerCalls.late', { count: late }) : undefined}
      />
      <FigureCard
        order="labelFirst"
        tall
        label={t('ownerCalls.status.acknowledged')}
        value={String(coming)}
      />
      <FigureCard
        order="labelFirst"
        tall
        label={t('ownerCalls.avgLong')}
        value={avg == null ? '–' : t('ownerCalls.minutes', { count: avg })}
      />
      <FigureCard
        order="labelFirst"
        tall
        label={t('ownerCalls.topReason')}
        value={top ? t(`waiter.reasons.${top}`) : '–'}
      />
    </CardGrid>
  );
}
