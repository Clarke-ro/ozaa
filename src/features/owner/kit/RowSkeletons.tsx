import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';

/** Grey lines in the shape of PanelRows while a Panel's list loads, so nothing jumps. */
export function RowSkeletons({ count = 3 }: { count?: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={t('errors.loading')}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.row, { borderTopColor: theme.line }]}>
          <View style={[styles.tile, { backgroundColor: theme.wash }]} />
          <View style={styles.copy}>
            <View style={[styles.line, styles.long, { backgroundColor: theme.wash }]} />
            <View style={[styles.line, styles.short, { backgroundColor: theme.wash }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget + tokens.space[4],
    paddingHorizontal: tokens.space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tile: { width: tokens.space[10], height: tokens.space[10], borderRadius: tokens.radius.md },
  copy: { flex: 1, gap: tokens.space[2] },
  line: { height: tokens.space[3], borderRadius: tokens.radius.sm },
  long: { width: '60%' },
  short: { width: '35%' },
});
