import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Building2, CircleCheck, MapPin } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { Location } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useDraft } from '../../data/useDraft';
import { InputRow, LinkRow, SaveBar, Section, toast } from '../../kit';
import { LocationEditor } from './LocationEditor';

export function BusinessScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId);
  const switchVenue = useOwnerSession((state) => state.switchVenue);
  const data = useQuery({ queryKey: ownerKeys.business(), queryFn: () => api.ownerGetBusiness() });
  const draft = useDraft({ name: data.data?.business.name ?? '' });
  const [editing, setEditing] = useState<Location | null | undefined>(undefined);
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

        <Section
          title={t('ownerBusiness.locations', { count: locations.length })}
          action={
            <Button
              label={t('ownerBusiness.addLocation')}
              tone="ghost"
              size="md"
              onPress={() => setEditing(null)}
            />
          }
        >
          {locations.map((location) => {
            const active = location.id === venueId;
            const place = [location.city, location.country].filter(Boolean).join(', ');
            return (
              <View key={location.id}>
                <LinkRow
                  icon={active ? CircleCheck : Building2}
                  label={location.name}
                  value={active ? t('ownerBusiness.active') : undefined}
                  onPress={() => setEditing(location)}
                />
                <View style={styles.meta}>
                  <View style={styles.place}>
                    {place ? <MapPin size={14} color={theme.muted} /> : null}
                    <Text variant="caption" style={{ color: theme.muted }}>
                      {place}
                    </Text>
                  </View>
                  {active ? null : (
                    <Button
                      label={t('ownerBusiness.use')}
                      tone="secondary"
                      size="md"
                      onPress={() => {
                        switchVenue(location.id);
                        toast.success(t('ownerBusiness.switched', { name: location.name }));
                      }}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </Section>
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
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
    paddingLeft: 52,
    paddingRight: tokens.space[4],
    paddingBottom: tokens.space[3],
  },
  place: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1], flex: 1 },
});
