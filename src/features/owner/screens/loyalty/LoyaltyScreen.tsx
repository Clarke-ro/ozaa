import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { ChipRow } from '../../kit';
import { useOwnerLayout } from '../../chrome/layout';
import { GuestPreview } from './GuestPreview';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { CustomerList } from '../customers/CustomerList';
import { ProgramForm, useProgramEditor } from './ProgramForm';
import { LoyaltyOverview } from './LoyaltyOverview';
import { ResultsTab } from './ResultsTab';

type Tab = 'program' | 'members' | 'results';

/**
 * Loyalty (design canvas): figure cards on top, chips for the programme, members and results.
 * On a desktop the programme sits beside "What guests see", a phone with the stamp card as it
 * will look.
 */
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
  const { desktop } = useOwnerLayout();

  return (
    <OwnerPage
      width="mid"
      title={t('owner.loyalty')}
      subtitle={t('ownerLead.loyalty')}
      action={
        <Button label={t('ownerLoyalty.scanCard')} onPress={() => router.push('/owner/scan')} />
      }
      footer={tab === 'program' ? editor.saveBar : null}
    >
      <LoyaltyOverview venueId={venueId} />
      <ChipRow<Tab>
        label={t('owner.loyalty')}
        value={tab}
        onChange={setTab}
        items={(['program', 'members', 'results'] as const).map((id) => ({
          id,
          label: t(`ownerLoyalty.tabs.${id}`),
        }))}
      />
      <DeskWait
        loading={loyalty.isPending}
        error={loyalty.isError}
        onRetry={() => void loyalty.refetch()}
      >
        {tab === 'program' && loyalty.data ? (
          desktop ? (
            <View style={styles.split}>
              <View style={styles.form}>
                <ProgramForm editor={editor} preview={false} />
              </View>
              <View style={styles.aside}>
                <GuestPreview
                  venueId={venueId}
                  stamps={editor.draft.value.stamps}
                  rewards={editor.draft.value.rewards}
                  tiersOn={editor.draft.value.tiersOn}
                />
              </View>
            </View>
          ) : (
            <ProgramForm editor={editor} />
          )
        ) : null}
        {tab === 'members' ? <CustomerList venueId={venueId} /> : null}
        {tab === 'results' ? <ResultsTab venueId={venueId} /> : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  // Canvas: the programme column and a 360 px preview, 24 px apart.
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[6] },
  form: { flex: 1, minWidth: 0 },
  aside: { width: 360 },
});
