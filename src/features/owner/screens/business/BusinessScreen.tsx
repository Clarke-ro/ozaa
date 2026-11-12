import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { Location } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';
import { AddLocationCard, LocationCard } from './LocationCard';
import { LocationEditor } from './LocationEditor';
import { BusinessDetails } from './BusinessDetails';
import { HoursSection } from './HoursSection';
import { TaxSection } from './TaxSection';

export function BusinessScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId);
  const switchVenue = useOwnerSession((state) => state.switchVenue);
  const data = useQuery({ queryKey: ownerKeys.business(), queryFn: () => api.ownerGetBusiness() });
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId ?? ''),
    queryFn: () => api.ownerGetVenue(venueId ?? ''),
    enabled: Boolean(venueId),
  });
  const params = useLocalSearchParams<{ add?: string }>();
  const [editing, setEditing] = useState<Location | null | undefined>(
    params.add === '1' ? null : undefined,
  );
  const locations = data.data?.locations ?? [];
  const business = data.data?.business;

  return (
    <OwnerPage title={t('owner.business')} subtitle={t('ownerLead.business')}>
      <DeskWait loading={data.isLoading} error={data.isError} onRetry={() => void data.refetch()}>
        {business ? <BusinessDetails key={business.name} business={business} /> : null}

        <View style={styles.stack}>
          <Text variant="body-strong" style={styles.label}>
            {t('ownerBusiness.locationsLabel')}
          </Text>
          <View style={styles.list}>
            {locations.map((location) => (
              <View key={location.id}>
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
            <View>
              <AddLocationCard onPress={() => setEditing(null)} />
            </View>
          </View>
        </View>
        {venue.data ? (
          <>
            <TaxSection venue={venue.data} tin={business?.tin ?? null} />
            <HoursSection key={venue.data.id} venue={venue.data} />
          </>
        ) : null}
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
  label: { fontSize: tokens.type.caption.size + 1 },
});
