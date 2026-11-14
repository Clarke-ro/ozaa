import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { WaiterCall } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { CardGrid, cardStyle } from '../../kit';
import { reasonCounts } from './callBoard';

/** "Today by reason" (design canvas): one small card per kind of call, zeros in grey. */
export function ReasonCounts({
  calls,
  columns,
}: {
  calls: readonly WaiterCall[];
  columns: number;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <Text variant="title" accessibilityRole="header">
        {t('ownerCalls.byReason')}
      </Text>
      <CardGrid columns={columns} gap={tokens.owner.controls.listGap}>
        {reasonCounts(calls).map(({ reason, count }) => (
          <View
            key={reason}
            style={[cardStyle(theme), styles.card]}
            accessible
            accessibilityLabel={`${t(`ownerCalls.reasonShort.${reason}`)}: ${count}`}
          >
            <Text style={[styles.label, { color: theme.muted }]} numberOfLines={1}>
              {t(`ownerCalls.reasonShort.${reason}`)}
            </Text>
            <Text style={[styles.count, count === 0 && { color: theme.meta }]}>{count}</Text>
          </View>
        ))}
      </CardGrid>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.owner.controls.headGap, marginTop: tokens.space[6] },
  card: {
    flex: 1,
    minWidth: 0,
    paddingVertical: tokens.space[4],
    paddingHorizontal: tokens.owner.controls.cardPadding,
    gap: 6,
  },
  label: { fontSize: 15, lineHeight: 20 },
  count: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
});
