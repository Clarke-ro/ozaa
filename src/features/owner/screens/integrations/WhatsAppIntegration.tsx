import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { WHATSAPP_ALERTS_ENABLED } from '@/lib/features';
import { WhatsAppLogo } from './BrandLogos';
import { IntegrationCard } from './IntegrationCard';
import { WhatsAppAlertsCard } from './WhatsAppAlertsCard';
import { ownerKeys } from '../../data/keys';

/** The WhatsApp row on Integrations: "Coming soon" while the flag is off, the alerts card when on. */
export function WhatsAppIntegration({ venueId }: { venueId: string }) {
  return WHATSAPP_ALERTS_ENABLED ? <Live venueId={venueId} /> : <Soon />;
}

function Soon() {
  const { t } = useTranslation();
  return (
    <IntegrationCard
      logo={<WhatsAppLogo />}
      title={t('ownerPay.whatsapp')}
      subtitle={t('ownerPay.whatsappSub')}
      badge={t('ownerPay.soon')}
    />
  );
}

function Live({ venueId }: { venueId: string }) {
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  // Keyed on the saved number, so the field starts from it again after each save.
  return venue.data ? (
    <WhatsAppAlertsCard key={venue.data.whatsappAlerts ?? 'off'} venue={venue.data} />
  ) : null;
}
