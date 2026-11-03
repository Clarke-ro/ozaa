import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import type { Wallet } from './facts';

/** While a reward is waiting for staff: its code, what it is, and until when. The card's back shows the QR. */
export function ClaimBox({ claim }: { claim: NonNullable<Wallet['liveClaim']> }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View
      accessibilityRole="summary"
      style={[styles.box, { borderColor: theme.fill, backgroundColor: theme.tint }]}
    >
      <Text variant="caption" style={[styles.strong, { color: theme.badgeInk }]}>
        {t('loyalty.claimTitle')}
      </Text>
      <Text variant="display-l" style={styles.code}>
        {claim.code}
      </Text>
      <Text variant="body-strong">{claim.title}</Text>
      <Text variant="caption" style={{ color: theme.muted }}>
        {t('loyalty.claimExpires', { time: claim.expiresAt.slice(11, 16) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    padding: tokens.space[4],
    gap: tokens.space[1],
  },
  code: { letterSpacing: 2, fontVariant: ['tabular-nums'] },
  strong: { fontFamily: fontFamily.strong },
});
