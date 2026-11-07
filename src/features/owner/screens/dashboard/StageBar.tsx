import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { InlineFigure } from './InlineFigure';
import type { Stage } from './kitchenFlow';

/**
 * The kitchen at a glance, as one line of big counts ("2 New  1 Cooking  3 Ready"), then a
 * warning line for each stage whose oldest ticket is late. Late counts and lines use the same
 * amber and red as the wait pills on the tickets and on Orders, so late always looks the same.
 */
export function StageBar({ stages }: { stages: Stage[] }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const toneInk = (s: Stage) =>
    s.tone === 'very_late' ? theme.error : s.tone === 'late' ? theme.warning : undefined;
  const late = stages.filter((s) => toneInk(s));

  return (
    <View style={styles.block}>
      <View style={styles.counts}>
        {stages.map((s) => (
          <InlineFigure
            key={s.id}
            big
            value={String(s.count)}
            words={t(`ownerOrders.tabs.${s.id}`)}
            ink={toneInk(s)}
          />
        ))}
      </View>
      {late.map((s) => {
        const ink = toneInk(s) ?? theme.warning;
        return (
          <View key={s.id} style={styles.late}>
            <Clock size={20} color={ink} />
            <Text variant="body-strong" style={{ color: ink }} numberOfLines={1}>
              {t('ownerDash.flow.lateStage', {
                label: t(`ownerOrders.tabs.${s.id}`),
                count: s.oldestMinutes ?? 0,
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: tokens.space[2] },
  // Pulled left by each figure's own padding, so the first count lines up with the heading.
  counts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: tokens.space[6],
    marginLeft: -tokens.space[2],
  },
  late: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
});
