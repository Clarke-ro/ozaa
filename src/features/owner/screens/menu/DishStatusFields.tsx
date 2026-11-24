import { useTranslation } from 'react-i18next';
import type { DishStatus } from '@/lib/dishRules';
import { Chips, Segmented, TitledSection } from '../../kit';
import type { SnoozePick } from './useDishForm';

/**
 * The dish status, straight on the page. Out of stock adds "For how long?", so a
 * dish can be sold out for a while and come back by itself (snoozedUntil).
 */
export function DishStatusFields({
  status,
  onStatus,
  snooze,
  onSnooze,
  back,
}: {
  status: DishStatus;
  onStatus: (status: DishStatus) => void;
  snooze: SnoozePick;
  onSnooze: (pick: SnoozePick) => void;
  /** "17:00" when the dish is snoozed now, so that time can be kept. */
  back: string | null;
}) {
  const { t } = useTranslation();
  return (
    <>
      <TitledSection plain title={t('ownerMenu.status')}>
        <Segmented
          label={t('ownerMenu.status')}
          value={status}
          onChange={onStatus}
          options={[
            { id: 'available', label: t('ownerMenu.statusAvailable') },
            { id: 'sold_out', label: t('ownerMenu.statusSoldOut') },
            { id: 'hidden', label: t('ownerMenu.statusHidden') },
          ]}
        />
      </TitledSection>
      {status === 'sold_out' ? (
        <TitledSection plain title={t('ownerMenu.snooze.title')}>
          <Chips<SnoozePick>
            single
            label={t('ownerMenu.snooze.title')}
            options={[
              ...(back
                ? [{ id: 'keep' as const, label: t('ownerMenu.snooze.keep', { time: back }) }]
                : []),
              { id: 'off', label: t('ownerMenu.snooze.off') },
              { id: '1h', label: t('ownerMenu.snooze.1h') },
              { id: '2h', label: t('ownerMenu.snooze.2h') },
              { id: 'today', label: t('ownerMenu.snooze.today') },
            ]}
            selected={[snooze]}
            onChange={(ids) => onSnooze(ids[0] ?? 'off')}
          />
        </TitledSection>
      ) : null}
    </>
  );
}
