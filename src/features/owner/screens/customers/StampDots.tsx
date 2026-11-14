import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { TitledSection } from '../../kit';

/** The stamp card as circles (canvas): filled with a tick for each stamp, dashed for the rest. */
export function StampDots({
  stamps,
  required,
  reward,
}: {
  stamps: number;
  required: number;
  reward: string | null;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const onCard = Math.min(stamps, required);
  const left = required - onCard;
  const note =
    left === 0
      ? t('ownerMembers.rewardReady')
      : reward
        ? t('ownerMembers.leftFor', { count: left, reward })
        : t('ownerMembers.progress', { count: onCard, total: required });
  return (
    <TitledSection title={t('ownerMembers.stampsTitle')} cardStyle={styles.card}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={note}
        accessibilityValue={{ min: 0, max: required, now: onCard }}
        style={styles.dots}
      >
        {Array.from({ length: required }, (_, i) =>
          i < onCard ? (
            <View key={i} style={[styles.dot, { backgroundColor: theme.text }]}>
              <Check size={16} color={theme.surface} strokeWidth={3} />
            </View>
          ) : (
            <View key={i} style={[styles.dot, styles.empty, { borderColor: theme.meta }]} />
          ),
        )}
      </View>
      <Text variant="caption" style={{ color: theme.muted }}>
        {note}
      </Text>
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  card: { padding: tokens.owner.controls.cardPadding, gap: tokens.space[3] },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  empty: { borderWidth: 1.5, borderStyle: 'dashed' },
});
