import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { Location } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useDraft } from '../../data/useDraft';
import { InputRow, SaveBar, Section, SectionLabel, toast } from '../../kit';
import { AddLocationCard, LocationCard } from './LocationCard';
import { LocationEditor } from './LocationEditor';

export function BusinessScreen() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId);
  const switchVenue = useOwnerSession((state) => state.switchVenue);
  const data = useQuery({ queryKey: ownerKeys.business(), queryFn: () => api.ownerGetBusiness() });
  const draft = useDraft({ name: data.data?.business.name ?? '' });
  // `?add=1` (from the Today location menu) opens a blank location straight away.
  const params = useLocalSearchParams<{ add?: string }>();
  const [editing, setEditing] = useState<Location | null | undefined>(
    params.add === '1' ? null : undefined,
  );
  const locations = data.data?.locations ?? [];

  const rename = useMutation({
    mutationFn: (name: string) => api.ownerUpdateBusiness({ name }),
    onSuccess: () => {
      toast.success(t('ownerKit.saved'));
      draft.reset();
      void client.invalidateQueries({ queryKey: ownerKeys.business() });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const saveName = () => {
    const name = draft.value.name.trim();
    if (name) rename.mutate(name);
    else toast.error(t('ownerBusiness.needName'));
  };

  return (
    <OwnerPage
      title={t('owner.business')}
      footer={
        <SaveBar
          visible={draft.dirty}
          saving={rename.isPending}
          onDiscard={draft.reset}
          onSave={saveName}
        />
      }
    >
      <DeskWait loading={data.isLoading} error={data.isError} onRetry={() => void data.refetch()}>
        <Section title={t('ownerBusiness.business')} note={t('ownerBusiness.nameNote')}>
          <InputRow
            label={t('owner.businessName')}
            value={draft.value.name}
            onChangeText={(v) => draft.set('name', v)}
          />
        </Section>

        <View style={styles.stack}>
          <SectionLabel title={t('ownerBusiness.locations', { count: locations.length })} caps />
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              active={location.id === venueId}
              onEdit={() => setEditing(location)}
              onSwitch={() => {
                switchVenue(location.id);
                toast.success(t('ownerBusiness.switched', { name: location.name }));
              }}
            />
          ))}
          <AddLocationCard onPress={() => setEditing(null)} />
        </View>
      </DeskWait>
      {editing !== undefined ? (
        <LocationEditor
          key={editing?.id ?? 'new'}
          location={editing}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </OwnerPage>
  );
}

const styles = StyleSheet.create({ stack: { gap: tokens.space[3] } });
