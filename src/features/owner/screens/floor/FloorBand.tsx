import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { CardGrid } from '../../kit';
import type { FloorGroup } from './floorGroups';

/**
 * One band of the room: its name and how many tables are in it, then the tables. Busy bands are
 * a grid of cards; the free band is a row of small chips (`compact`), since nothing is due there.
 */
export function FloorBand({
  group,
  count,
  columns,
  compact,
  children,
}: {
  group: FloorGroup;
  count: number;
  columns: number;
  compact?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.band}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header">
          {t(`ownerFloor.group.${group}`)}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {t('ownerFloor.tables', { count })}
        </Text>
      </View>
      {compact ? (
        <View style={styles.chips}>{children}</View>
      ) : (
        <CardGrid columns={columns}>{children}</CardGrid>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { gap: tokens.space[3] },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
});
