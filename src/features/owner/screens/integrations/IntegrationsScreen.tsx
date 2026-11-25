import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { useOwnerLayout } from '../../chrome/layout';
import { ownerKeys } from '../../data/keys';
import { GoogleLogo, TripadvisorLogo } from './BrandLogos';
import { ChowdeckCard } from './ChowdeckCard';
import { FeePassingCard } from './FeePassingCard';
import { IntegrationCard } from './IntegrationCard';
import { BankCard, CardMachineCard, CashCard, MomoCard } from './ManualPaymentsCard';
import { PaystackCard } from './PaystackCard';
import { WhatsAppIntegration } from './WhatsAppIntegration';

// Room between cards and between groups (Clarke, 25 Nov 2026: more space, taller cards).
const CARD_GAP = tokens.space[5];
const GROUP_GAP = tokens.space[12];

/**
 * Integrations (design canvas) as a list of cards; each integration's settings open on their own
 * page (/owner/integrations/[id]). On a desktop: Payments in two columns of three (online first:
 * Paystack, fees, cash; then card machine, bank transfer, MoMo), then Delivery apps beside
 * Messages, then Reviews and listings. Phones and tablets show one column.
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
  const data = settings.data;
  return (
    <OwnerPage width="wide" title={t('owner.integrations')} subtitle={t('ownerPay.lead')}>
      <DeskWait
        loading={settings.isPending}
        error={settings.isError}
        onRetry={() => void settings.refetch()}
      >
        {data ? (
          <View style={styles.page}>
            <Group title={t('ownerPay.paymentsTitle')}>
              <Columns columns={columns}>
                <PaystackCard settings={data} />
                {/* The fee only exists on payments in the app, so it shows once Paystack is connected. */}
                {data.paystack ? <FeePassingCard venueId={venueId} settings={data} /> : null}
                <CashCard venueId={venueId} settings={data} />
                <CardMachineCard venueId={venueId} settings={data} />
                <BankCard venueId={venueId} settings={data} />
                <MomoCard venueId={venueId} settings={data} />
              </Columns>
            </Group>
            <Columns columns={columns}>
              <Group title={t('ownerPay.deliveryTitle')}>
                <ChowdeckCard venueId={venueId} />
              </Group>
              <Group title={t('ownerPay.messagesTitle')}>
                <WhatsAppIntegration venueId={venueId} />
              </Group>
            </Columns>
            {/* Not in the API contract yet, so shown as coming soon rather than as switches that do nothing. */}
            <Group title={t('ownerPay.listingsTitle')}>
              <Columns columns={columns}>
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
              </Columns>
            </Group>
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

/** A group: its title, then its cards with room between them. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.cards}>{children}</View>
    </View>
  );
}

/**
 * Splits its children into side-by-side columns, filled top to bottom: six cards in two columns
 * are three and three. Each column is its own stack, so a taller card never stretches the card
 * beside it. One column is a plain stack.
 */
function Columns({
  columns,
  gap = CARD_GAP,
  children,
}: {
  columns: number;
  gap?: number;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  if (columns <= 1) return <View style={{ gap }}>{items}</View>;
  const perColumn = Math.ceil(items.length / columns);
  return (
    <View style={[styles.row, { gap }]}>
      {Array.from({ length: columns }, (_, c) => (
        <View key={c} style={[styles.column, { gap: CARD_GAP }]}>
          {items.slice(c * perColumn, (c + 1) * perColumn)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: GROUP_GAP },
  group: { gap: tokens.space[4] },
  cards: { gap: CARD_GAP },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, minWidth: 0 },
});
