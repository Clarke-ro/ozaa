import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { Location } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useDraft } from '../../data/useDraft';
import { Field, SaveBar, toast } from '../../kit';
import { AddLocationCard, LocationCard } from './LocationCard';
import { LocationEditor } from './LocationEditor';

export function BusinessScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const twoCol = width >= 900;
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId);
  const switchVenue = useOwnerSession((state) => state.switchVenue);
  const data = useQuery({ queryKey: ownerKeys.business(), queryFn: () => api.ownerGetBusiness() });
  const draft = useDraft({ name: data.data?.business.name ?? '' });
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
        <Field
          label={t('owner.businessName')}
          value={draft.value.name}
          onChangeText={(v) => draft.set('name', v)}
        />

        <View style={styles.stack}>
          <Text variant="body-strong" style={styles.label}>
            {t('ownerBusiness.locationsLabel')}
          </Text>
          <View style={[styles.list, twoCol && styles.grid]}>
            {locations.map((location) => (
              <View key={location.id} style={twoCol ? styles.cell : undefined}>
                <LocationCard
                  location={location}
                  active={location.id === venueId}
                  onEdit={() => setEditing(location)}
                  onSwitch={() => {
                    switchVenue(location.id);
                    toast.success(t('ownerBusiness.switched', { name: location.name }));
                  }}
                />
              </View>
            ))}
            <View style={twoCol ? styles.cell : undefined}>
              <AddLocationCard onPress={() => setEditing(null)} />
            </View>
          </View>
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

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  list: { gap: tokens.space[3] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' },
  cell: { flexBasis: '48.5%', flexGrow: 1 },
  label: { fontSize: tokens.type.caption.size + 1 },
});
