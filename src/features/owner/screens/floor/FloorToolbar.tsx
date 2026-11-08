import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../../chrome/layout';
import { ChipRow } from '../../kit';
import { FloorLegend } from './FloorLegend';
import { FLOOR_FILTERS, type FloorFilter } from './floorFilter';

const CHIP_LABEL: Record<FloorFilter, string> = {
  all: 'ownerFloor.filter.all',
  needs_waiter: 'ownerFloor.filter.calls',
  waiting_to_pay: 'ownerFloor.filter.paying',
  active: 'ownerFloor.filter.active',
  free: 'ownerFloor.filter.free',
};

/**
 * The filter chips with a count in each, and the colour legend. One line on wide screens
 * (chips left, legend right); stacked on phones so neither gets squeezed.
 */
export function FloorToolbar({
  counts,
  value,
  onChange,
}: {
  counts: Record<FloorFilter, number>;
  value: FloorFilter;
  onChange: (filter: FloorFilter) => void;
}) {
  const { t } = useTranslation();
  const { wide } = useOwnerLayout();
  const chips = FLOOR_FILTERS.map((id) => ({ id, label: t(CHIP_LABEL[id]), count: counts[id] }));
  return (
    <View style={wide ? styles.row : styles.stack}>
      <View style={wide && styles.chips}>
        <ChipRow
          items={chips}
          value={value}
          onChange={onChange}
          label={t('ownerFloor.filter.label')}
        />
      </View>
      <FloorLegend />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[4],
  },
  stack: { gap: tokens.space[3] },
  chips: { flexShrink: 1, minWidth: 0 },
});
