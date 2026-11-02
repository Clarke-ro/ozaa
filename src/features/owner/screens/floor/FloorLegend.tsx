import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FLOOR_TONES, type FloorTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const ORDER: FloorTone[] = ['free', 'occupied', 'paying', 'calling'];

/** What each card colour means, in one short row. */
export function FloorLegend() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {ORDER.map((tone) => (
        <View key={tone} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: FLOOR_TONES[theme.scheme][tone].edge }]} />
          <Text variant="caption" style={{ color: theme.muted }}>
            {t(`ownerFloor.legend.${tone}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  item: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
