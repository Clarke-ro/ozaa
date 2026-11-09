import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MousePointerClick } from 'lucide-react-native';
import type { StaffRole } from '@/features/orders';
import type { FloorTable, Order } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle, IconTile } from '../../kit';
import { TableDetailBody, useTableTitle } from './TableDetailBody';
import type { FloorActions } from './useFloorActions';

/**
 * Desktop only: the picked table in a card beside the room, so staff can read a bill and act on
 * it without covering the other tables. With nothing picked it says how to start.
 */
export function TablePanel({
  table,
  ...props
}: {
  table: FloorTable | null;
  bill: Order | null;
  currency: string;
  role: StaffRole;
  actions: FloorActions;
  onMarkPaid: (order: Order) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[cardStyle(theme), styles.card]}>
      {table ? (
        <Picked table={table} {...props} />
      ) : (
        <View style={styles.empty}>
          <IconTile icon={MousePointerClick} tone="wash" size={tokens.touchTarget} />
          <Text variant="body" style={[styles.center, { color: theme.muted }]}>
            {t('ownerFloor.pickTable')}
          </Text>
        </View>
      )}
    </View>
  );
}

function Picked(props: Parameters<typeof TableDetailBody>[0]) {
  const theme = useTheme();
  const { title, subtitle } = useTableTitle(props.table);
  return (
    <View style={styles.stack}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {subtitle}
        </Text>
      </View>
      <TableDetailBody {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: tokens.space[4] },
  stack: { gap: tokens.space[4] },
  head: { gap: 2 },
  empty: { alignItems: 'center', gap: tokens.space[3], paddingVertical: tokens.space[8] },
  center: { textAlign: 'center' },
});
