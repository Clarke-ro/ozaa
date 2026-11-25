import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Percent } from 'lucide-react-native';
import type { FeePassing, PaymentSettings } from '@/lib/api/types';
import { IntegrationCard } from './IntegrationCard';
import { usePayments } from './usePayments';

/**
 * "Pass fees to customers" (BUILD.md section 4) on the Integrations list. The switch turns it on
 * or off at once; the share guests pay is picked on its own page. It never applies to cash, card
 * machine, bank transfer or MoMo to the venue's own number.
 */
export function FeePassingCard({
  venueId,
  settings,
}: {
  venueId: string;
  settings: PaymentSettings;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { setFees } = usePayments(venueId);
  const fees: FeePassing = settings.feePassing ?? { enabled: false, percent: 100 };
  const open = () => router.push('/owner/integrations/fees');
  return (
    <IntegrationCard
      icon={Percent}
      title={t('ownerPay.feesTitle')}
      subtitle={t('ownerPay.feesSub')}
      status={
        fees.enabled ? t('ownerPay.feesShareOn', { percent: fees.percent }) : t('ownerPay.off')
      }
      on={fees.enabled}
      onToggle={(enabled) => setFees.mutate({ ...fees, enabled })}
      onOpen={open}
    />
  );
}
