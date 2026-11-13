import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { STATUS_TONES, type StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { CardGrid } from '../../kit';
import type { FloorGroup } from './floorGroups';

const BAND_TONE: Record<FloorGroup, StatusTone> = {
  attention: 'alert',
  eating: 'info',
  free: 'success',
};

/** One band of the room (canvas): its name with a count in the band's colour, then the tables. */
export function FloorBand({
  group,
  count,
  columns,
  children,
}: {
  group: FloorGroup;
  count: number;
  columns: number;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const tone = STATUS_TONES[theme.scheme][BAND_TONE[group]];
  return (
    <View style={styles.band}>
      <View style={styles.head}>
        <Text
          accessibilityRole="header"
          accessibilityLabel={`${t(`ownerFloor.group.${group}`)}, ${t('ownerFloor.tables', { count })}`}
          style={styles.title}
        >
          {t(`ownerFloor.group.${group}`)}
        </Text>
        <View style={[styles.count, { backgroundColor: tone.bg }]}>
          <Text style={[styles.countText, { color: tone.ink }]}>{count}</Text>
        </View>
      </View>
      <CardGrid columns={columns} gap={tokens.owner.controls.listGap}>
        {children}
      </CardGrid>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { gap: tokens.owner.controls.headGap },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: {
    fontSize: tokens.owner.type.title.size,
    lineHeight: tokens.owner.type.title.line,
    fontFamily: fontFamily.strong,
  },
  count: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.strong },
});
