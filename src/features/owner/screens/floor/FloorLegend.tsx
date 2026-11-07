import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FLOOR_TONES, type FloorTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const TONES: readonly FloorTone[] = ['free', 'occupied', 'paying', 'calling'];

/** What the tile strip colours mean: a dot in each colour with its word. */
export function FloorLegend() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {TONES.map((tone) => (
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

const DOT = tokens.space[2];

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[3] },
  item: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  dot: { width: DOT, height: DOT, borderRadius: tokens.radius.full },
});
