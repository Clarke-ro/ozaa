import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { GoogleLogo, TripadvisorLogo } from './BrandLogos';
import { IntegrationCard } from './IntegrationCard';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { ManualPaymentsCard } from './ManualPaymentsCard';
import { PaystackCard } from './PaystackCard';
import { WhatsAppIntegration } from './WhatsAppIntegration';

/**
 * Integrations > Payments (design canvas): the venue's own Paystack account and the ways guests
 * pay in person, as cards with switches; then Google and Tripadvisor, which say "Coming soon",
 * and WhatsApp order alerts, behind WHATSAPP_ALERTS_ENABLED (off).
 */
export function IntegrationsScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const settings = useQuery({
    queryKey: ownerKeys.paymentSettings(venueId),
    queryFn: () => api.ownerGetPaymentSettings(venueId),
    enabled: Boolean(venueId),
  });
  return (
    <OwnerPage title={t('owner.integrations')} subtitle={t('ownerPay.lead')}>
      <DeskWait
        loading={settings.isLoading}
        error={settings.isError}
        onRetry={() => void settings.refetch()}
      >
        {settings.data ? (
          <View style={styles.group}>
            <Text variant="title" accessibilityRole="header">
              {t('ownerPay.paymentsTitle')}
            </Text>
            <PaystackCard venueId={venueId} settings={settings.data} />
            {/* Keyed on the saved settings, so the form starts from them after each save. */}
            <ManualPaymentsCard
              key={JSON.stringify(settings.data.manual)}
              venueId={venueId}
              settings={settings.data}
            />
            {/* Not in the API contract yet, so shown as coming soon rather than as switches that do nothing. */}
            <Text variant="title" accessibilityRole="header" style={styles.next}>
              {t('ownerPay.listingsTitle')}
            </Text>
            <IntegrationCard
              logo={<GoogleLogo />}
              title={t('ownerPay.google')}
              subtitle={t('ownerPay.googleSub')}
              badge={t('ownerPay.soon')}
            />
            <IntegrationCard
              logo={<TripadvisorLogo />}
              title={t('ownerPay.tripadvisor')}
              subtitle={t('ownerPay.tripadvisorSub')}
              badge={t('ownerPay.soon')}
            />
            <Text variant="title" accessibilityRole="header" style={styles.next}>
              {t('ownerPay.messagesTitle')}
            </Text>
            <WhatsAppIntegration venueId={venueId} />
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  // Canvas: 16 px under the heading, 10 px between the rows.
  group: { gap: tokens.owner.controls.listGap },
  next: { marginTop: tokens.space[10] - tokens.owner.controls.listGap },
});
