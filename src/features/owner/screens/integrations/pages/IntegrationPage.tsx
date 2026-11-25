import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react-native';
import { useOwnerSession } from '@/features/session';
import { OwnerPage } from '../../../chrome/OwnerPage';
import { EmptyCard } from '../../../kit';
import { BankPage, MomoPage } from './ManualPages';
import { ChowdeckPage } from './ChowdeckPage';
import { FeesPage } from './FeesPage';
import { PaystackPage } from './PaystackPage';
import { WhatsAppPage } from './WhatsAppPage';

const PAGES = {
  paystack: { title: 'ownerPay.paystack', Body: PaystackPage },
  fees: { title: 'ownerPay.feesTitle', Body: FeesPage },
  bank: { title: 'ownerPay.bank', Body: BankPage },
  momo: { title: 'ownerPay.momo', Body: MomoPage },
  chowdeck: { title: 'ownerChannels.chowdeck', Body: ChowdeckPage },
  whatsapp: { title: 'ownerPay.whatsapp', Body: WhatsAppPage },
} as const;

export type PageProps = { venueId: string; done: () => void };

/**
 * One integration's settings on their own page (Clarke, 25 Nov 2026), opened from its card on
 * Integrations. Every finished save returns to the list.
 */
export function IntegrationPage({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const back = () => (router.canGoBack() ? router.back() : router.replace('/owner/integrations'));
  // After a save: back to the list, whether the owner came from it or from a link.
  const done = () => router.dismissTo('/owner/integrations');
  const page = PAGES[id as keyof typeof PAGES];
  return (
    <OwnerPage
      title={page ? t(page.title) : t('owner.integrations')}
      back={{ label: t('owner.integrations'), onPress: back }}
    >
      {page ? (
        <page.Body venueId={venueId} done={done} />
      ) : (
        <EmptyCard
          icon={SearchX}
          title={t('ownerPay.noSuchIntegration')}
          description={t('ownerPay.noSuchIntegrationBody')}
          actionLabel={t('owner.integrations')}
          onAction={back}
        />
      )}
    </OwnerPage>
  );
}
