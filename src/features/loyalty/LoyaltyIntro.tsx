import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const ICON_TILE = 56;

/** The top of Loyalty for someone not yet in: one line about the card and a Join button. */
export function LoyaltyIntro({ venueName, onJoin }: { venueName: string; onJoin: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={[styles.icon, { backgroundColor: theme.tint }]}>
        <Gift size={28} color={theme.ink} strokeWidth={2} />
      </View>
      <Text variant="display-m" style={styles.title}>
        {t('loyalty.introTitle', { venue: venueName })}
      </Text>
      <Button label={t('loyalty.join')} onPress={onJoin} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: tokens.space[4],
    padding: tokens.space[6],
    borderRadius: tokens.radius.xl,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  icon: {
    width: ICON_TILE,
    height: ICON_TILE,
    borderRadius: ICON_TILE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center' },
  button: { alignSelf: 'stretch' },
});
