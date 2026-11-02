import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * The top of Loyalty for someone not yet in: what this venue gives, then one Join button.
 * The sign-up form only opens after that tap.
 */
export function LoyaltyIntro({
  venueName,
  firstReward,
  onJoin,
}: {
  venueName: string;
  /** The cheapest reward, from the venue's programme, or null while it loads. */
  firstReward: { title: string } | null;
  onJoin: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <Gift size={28} color={theme.ink} strokeWidth={2} />
      <Text variant="display-m">{t('loyalty.introTitle', { venue: venueName })}</Text>
      {firstReward ? (
        <Text variant="body-strong">{t('loyalty.introReward', { reward: firstReward.title })}</Text>
      ) : null}
      <Text variant="body" style={{ color: theme.muted }}>
        {t('loyalty.introBody')}
      </Text>
      <Button label={t('loyalty.join')} onPress={onJoin} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[3],
    padding: tokens.space[5],
    borderRadius: tokens.radius.xl,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
});
