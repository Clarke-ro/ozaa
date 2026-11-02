import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { DeskTabs } from '../../kit';
import { LoyaltyAnalyticsScreen } from '../LoyaltyAnalyticsScreen';
import { LoyaltyCustomersScreen } from '../LoyaltyCustomersScreen';
import { ProgramForm, useProgramEditor } from './ProgramForm';

type Tab = 'program' | 'members' | 'results';

export function LoyaltyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [tab, setTab] = useState<Tab>('program');
  const loyalty = useQuery({
    queryKey: ownerKeys.loyalty(venueId),
    queryFn: () => api.ownerGetLoyalty(venueId),
    enabled: Boolean(venueId),
  });
  const editor = useProgramEditor(venueId, loyalty.data);

  return (
    <OwnerPage
      title={t('owner.loyalty')}
      action={
        <Button
          label={t('ownerLoyalty.scan')}
          tone="secondary"
          size="md"
          onPress={() => router.push('/owner/scan')}
        />
      }
      footer={tab === 'program' ? editor.saveBar : null}
    >
      <DeskTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'program', label: t('ownerLoyalty.tabs.program') },
          { id: 'members', label: t('ownerLoyalty.tabs.members') },
          { id: 'results', label: t('ownerLoyalty.tabs.results') },
        ]}
      />
      <DeskWait
        loading={loyalty.isLoading}
        error={loyalty.isError}
        onRetry={() => void loyalty.refetch()}
      >
        {tab === 'program' && loyalty.data ? <ProgramForm editor={editor} /> : null}
        {tab === 'members' ? <LoyaltyCustomersScreen venueId={venueId} /> : null}
        {tab === 'results' ? <LoyaltyAnalyticsScreen venueId={venueId} /> : null}
      </DeskWait>
    </OwnerPage>
  );
}
