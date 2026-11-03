import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

// Show a guest who is part way through, so the owner sees both filled and empty stamps.
const SAMPLE_PROGRESS = 0.4;

/** A small picture of the guest's stamp card as it will look with these settings. */
export function StampPreview({ stamps, reward }: { stamps: number; reward: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const filled = Math.floor(stamps * SAMPLE_PROGRESS);
  return (
    <View
      accessible
      accessibilityLabel={t('ownerLoyalty.previewA11y', {
        stamps,
        reward: reward || t('ownerLoyalty.rewardHint'),
      })}
      style={[styles.card, { backgroundColor: theme.wash }]}
    >
      <View style={styles.dots}>
        {Array.from({ length: stamps }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < filled
                ? { backgroundColor: theme.fill, borderColor: theme.fill }
                : { borderColor: theme.line, backgroundColor: theme.surface },
            ]}
          />
        ))}
      </View>
      <View style={styles.reward}>
        <Gift size={16} color={theme.ink} />
        <Text variant="caption" numberOfLines={1} style={{ color: theme.muted, flex: 1 }}>
          {t('ownerLoyalty.previewLine', {
            count: stamps - filled,
            reward: reward.trim() || t('ownerLoyalty.rewardHint'),
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: tokens.space[3], padding: tokens.space[3], borderRadius: tokens.radius.md },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
});
