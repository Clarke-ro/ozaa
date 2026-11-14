import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { LoyaltyCustomerDetail } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { TitledSection } from '../../kit';

/**
 * Exactly what the guest agreed to (Act 843): the loyalty card with its date and consent text
 * version, and marketing, which is separate and off unless they ticked it.
 */
export function ConsentCard({
  consent,
  date,
}: {
  consent: LoyaltyCustomerDetail['consent'];
  date: (iso: string) => string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const state = (yes: boolean) => (
    <Text variant="caption" style={[styles.state, { color: yes ? theme.success : theme.muted }]}>
      {yes ? t('ownerMembers.agreed') : t('ownerMembers.notAgreed')}
    </Text>
  );
  return (
    <TitledSection title={t('ownerMembers.consentTitle')} cardStyle={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="body">{t('ownerMembers.loyaltyCard')}</Text>
          <Text variant="caption" style={{ color: theme.muted }}>
            {t('ownerMembers.consentAt', {
              date: date(consent.loyaltyAt),
              version: consent.textVersion,
            })}
          </Text>
        </View>
        {state(true)}
      </View>
      <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.line }]}>
        <View style={styles.flex}>
          <Text variant="body">{t('ownerMembers.marketing')}</Text>
          <Text variant="caption" style={{ color: theme.muted }}>
            {consent.marketing ? t('ownerMembers.marketingCan') : t('ownerMembers.marketingCant')}
          </Text>
        </View>
        {state(consent.marketing)}
      </View>
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 2, paddingHorizontal: tokens.owner.controls.cardPadding },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], minHeight: 60 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  state: { fontWeight: '600' },
});
