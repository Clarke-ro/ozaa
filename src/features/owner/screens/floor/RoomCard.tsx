import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FLOOR_TONES, type FloorTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { TONES } from './floorLook';

const BAR = tokens.space[3];

/**
 * The room in one card: how many tables are in use, a bar split by colour (free, occupied,
 * paying, calling) and a key with the count of each. It replaces the filter chips: the bands
 * below already put the tables that need someone first.
 */
export function RoomCard({ counts }: { counts: Record<FloorTone, number> }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const total = TONES.reduce((sum, tone) => sum + counts[tone], 0);
  const inUse = total - counts.free;
  const look = FLOOR_TONES[theme.scheme];

  return (
    <View style={[cardStyle(theme), styles.card]}>
      <View style={styles.head}>
        <Text variant="display-m" style={styles.num}>
          {t('ownerFloor.inUse', { count: inUse, total })}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {t('ownerFloor.inUseLabel')}
        </Text>
      </View>
      {total > 0 ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.bar, { backgroundColor: theme.wash }]}
        >
          {TONES.filter((tone) => counts[tone] > 0).map((tone) => (
            <View
              key={tone}
              style={{ flex: counts[tone], backgroundColor: look[tone].edge }}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.key}>
        {TONES.map((tone) => (
          <View key={tone} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: look[tone].edge }]} />
            <Text variant="caption" style={{ color: theme.muted }}>
              {t(`ownerFloor.legend.${tone}`)}
            </Text>
            <Text variant="caption" style={[styles.num, { color: theme.text }]}>
              {counts[tone]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const DOT = tokens.space[2];

const styles = StyleSheet.create({
  card: { padding: tokens.space[4], gap: tokens.space[3] },
  head: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: tokens.space[2] },
  num: { fontVariant: ['tabular-nums'] },
  // Segments sit edge to edge; a thin gap would read as a fifth colour.
  bar: { flexDirection: 'row', height: BAR, borderRadius: BAR / 2, overflow: 'hidden' },
  key: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[4] },
  item: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  dot: { width: DOT, height: DOT, borderRadius: tokens.radius.full },
});
