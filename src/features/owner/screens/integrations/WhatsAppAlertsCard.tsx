import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { VenueSettings } from '@/lib/api/types';
import { WhatsAppLogo } from './BrandLogos';
import { IntegrationCard } from './IntegrationCard';
import { useSaveVenue } from '../../data/useSaveVenue';

/**
 * WhatsApp order alerts (BUILD.md 4b.18), shown only when WHATSAPP_ALERTS_ENABLED is on. The
 * switch turns alerts off at once; turning them on needs a number, typed on their own page.
 */
export function WhatsAppAlertsCard({ venue }: { venue: VenueSettings }) {
  const { t } = useTranslation();
  const router = useRouter();
  const save = useSaveVenue(venue.id);
  const on = Boolean(venue.whatsappAlerts);
  const open = () => router.push('/owner/integrations/whatsapp');
  return (
    <IntegrationCard
      logo={<WhatsAppLogo />}
      title={t('ownerPay.whatsapp')}
      subtitle={t('ownerPay.alertsSub')}
      status={on ? t('ownerPay.on') : t('ownerPay.off')}
      on={on}
      // Off saves straight away, so alerts stop the moment the owner asks.
      onToggle={(next) => (next ? open() : save.mutate({ whatsappAlerts: null }))}
      onOpen={open}
    />
  );
}
