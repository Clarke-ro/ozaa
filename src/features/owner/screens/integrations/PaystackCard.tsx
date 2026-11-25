import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { PaymentSettings } from '@/lib/api/types';
import { PaystackLogo } from './BrandLogos';
import { IntegrationCard } from './IntegrationCard';

/**
 * Paystack on the Integrations list. Connecting and disconnecting both happen on its own page
 * (keys there, and a confirm before disconnecting), so the switch and the card both open it.
 */
export function PaystackCard({ settings }: { settings: PaymentSettings }) {
  const { t } = useTranslation();
  const router = useRouter();
  const paystack = settings.paystack;
  const open = () => router.push('/owner/integrations/paystack');
  return (
    <IntegrationCard
      logo={<PaystackLogo />}
      title={t('ownerPay.paystack')}
      subtitle={t('ownerPay.ownAccount')}
      status={
        paystack
          ? t('ownerPay.connectedMode', {
              mode: paystack.mode === 'test' ? t('ownerPay.testMode') : t('ownerPay.liveMode'),
            })
          : t('ownerPay.notConnected')
      }
      on={Boolean(paystack)}
      onToggle={open}
      onOpen={open}
    />
  );
}
