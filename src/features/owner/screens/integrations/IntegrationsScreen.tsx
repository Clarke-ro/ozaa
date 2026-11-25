import { Children, type ReactNode } from 'react';
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
import { useOwnerLayout } from '../../chrome/layout';
import { CardGrid } from '../../kit';
import { ChowdeckCard } from './ChowdeckCard';
import { ManualPaymentsCard } from './ManualPaymentsCard';
import { PaystackCard } from './PaystackCard';
import { FeePassingCard } from './FeePassingCard';
import { WhatsAppIntegration } from './WhatsAppIntegration';

/**
 * Integrations (design canvas), in groups: Payments (the venue's own Paystack account, the fee
 * share and the ways guests pay in person), Delivery apps (Chowdeck), then Google and Tripadvisor,
 * which say "Coming soon", and WhatsApp order alerts, behind WHATSAPP_ALERTS_ENABLED (off).
 * Desktops show each group's cards in two columns (Clarke, 25 Nov 2026).
 */
export function IntegrationsScreen() {
  const { t } = useTranslation();
  const { desktop } = useOwnerLayout();
  const columns = desktop ? 2 : 1;
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const settings = useQuery({
    queryKey: ownerKeys.paymentSettings(venueId),
    queryFn: () => api.ownerGetPaymentSettings(venueId),
    enabled: Boolean(venueId),
  });
  return (
    <OwnerPage width="wide" title={t('owner.integrations')} subtitle={t('ownerPay.lead')}>
      <DeskWait
        loading={settings.isPending}
        error={settings.isError}
        onRetry={() => void settings.refetch()}
      >
        {settings.data ? (
          <View style={styles.page}>
            <Group title={t('ownerPay.paymentsTitle')} columns={columns}>
              <PaystackCard venueId={venueId} settings={settings.data} />
              {/* The fee only exists on payments in the app, so it shows once Paystack is connected. */}
              {settings.data.paystack ? (
                <FeePassingCard venueId={venueId} settings={settings.data} />
              ) : null}
              {/* Keyed on the saved settings, so the form starts from them after each save. */}
              <ManualPaymentsCard
                key={JSON.stringify(settings.data.manual)}
                venueId={venueId}
                settings={settings.data}
              />
            </Group>
            <Group title={t('ownerPay.deliveryTitle')} columns={columns}>
              <ChowdeckCard venueId={venueId} />
            </Group>
            {/* Not in the API contract yet, so shown as coming soon rather than as switches that do nothing. */}
            <Group title={t('ownerPay.listingsTitle')} columns={columns}>
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
            </Group>
            <Group title={t('ownerPay.messagesTitle')} columns={columns}>
              <WhatsAppIntegration venueId={venueId} />
            </Group>
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

/**
 * One group: its title across the page, then its cards in `columns` (two on a desktop, so the
 * long cards sit side by side; one on phones and tablets).
 */
function Group({
  title,
  columns,
  children,
}: {
  title: string;
  columns: number;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {/* One column: a plain stack, each card its own height. Two: a cell per card in each row. */}
      {columns === 1 ? (
        children
      ) : (
        <CardGrid columns={columns} gap={tokens.owner.controls.listGap}>
          {Children.toArray(children).map((card, index) => (
            <View key={index} style={styles.cell}>
              {card}
            </View>
          ))}
        </CardGrid>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: tokens.space[10] },
  // Canvas: 16 px under the heading, 10 px between the rows.
  group: { gap: tokens.owner.controls.listGap },
  // Each card takes its share of the row and keeps its own height when its neighbour opens.
  cell: { flex: 1, minWidth: 0, alignSelf: 'flex-start' },
});
