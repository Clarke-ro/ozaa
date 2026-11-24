import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DishStatus } from '@/lib/dishRules';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Chips, Segmented, TitledSection } from '../../kit';
import type { SnoozePick } from './useDishForm';

/**
 * The dish's status, in its own card. Out of stock adds a second card, "For how long?", so a
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
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <>
      <TitledSection title={t('ownerMenu.status')} cardStyle={styles.pad}>
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
        <Text variant="caption" style={{ color: theme.meta }}>
          {t(`ownerMenu.statusHint.${status}`)}
        </Text>
      </TitledSection>
      {status === 'sold_out' ? (
        <TitledSection title={t('ownerMenu.snooze.title')} cardStyle={styles.pad}>
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

const styles = StyleSheet.create({
  pad: { padding: tokens.owner.controls.cardPadding, gap: tokens.space[3] },
});
