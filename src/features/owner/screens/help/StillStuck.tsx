import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { env } from '@/lib/env';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';

/**
 * "Still stuck?" with Email us and WhatsApp us. The support address and number come from the
 * build settings, never from the code. Until Clarke sets them, the card says who to ask instead.
 */
export function StillStuck() {
  const { t } = useTranslation();
  const email = env.EXPO_PUBLIC_SUPPORT_EMAIL;
  // wa.me wants the number as digits only, with the country code (233 for Ghana).
  const whatsapp = env.EXPO_PUBLIC_SUPPORT_WHATSAPP.replace(/\D/g, '');
  const any = Boolean(email || whatsapp);
  return (
    <View style={styles.card}>
      <Text variant="body" style={styles.flex}>
        {any ? t('ownerHelp.stuckBody') : t('ownerHelp.stuckFallback')}
      </Text>
      {email ? (
        <Button
          label={t('ownerHelp.email')}
          tone="secondary"
          onPress={() => void Linking.openURL(`mailto:${email}`)}
          style={styles.short}
        />
      ) : null}
      {whatsapp ? (
        <Button
          label={t('ownerHelp.whatsapp')}
          tone="secondary"
          onPress={() => void Linking.openURL(`https://wa.me/${whatsapp}`)}
          style={styles.short}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.owner.controls.cardPadding,
  },
  flex: { flex: 1, minWidth: 220 },
  short: { minHeight: 40 },
});
