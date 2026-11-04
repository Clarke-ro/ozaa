import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { ManualPaymentsCard } from './ManualPaymentsCard';
import { PaystackCard } from './PaystackCard';

/** Settings > Integrations > Payments: the venue's own Paystack account and its manual methods. */
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
          <>
            <PaystackCard venueId={venueId} settings={settings.data} />
            {/* Keyed on the saved settings, so the form starts from them after each save. */}
            <ManualPaymentsCard
              key={JSON.stringify(settings.data.manual)}
              venueId={venueId}
              settings={settings.data}
            />
          </>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}
