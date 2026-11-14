import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { Location } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { AddDashed, cardStyle, toast } from '../../kit';
import { SectionHead } from '../dashboard/SectionHead';
import { useTheme } from '@/ui/theme';
import { ClosedDays } from './ClosedDays';
import { hoursOn } from './hoursForm';
import { LocationCard } from './LocationCard';
import { LocationDetails } from './LocationDetails';
import { LocationEditor } from './LocationEditor';
import { BusinessDetails } from './BusinessDetails';
import { HoursSection } from './HoursSection';
import { TaxSection } from './TaxSection';

export function BusinessScreen() {
  const theme = useTheme();
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
  const current = locations.find((l) => l.id === venueId);
  const hours = hoursOn(venue.data?.hours, new Date());
  const todayLabel = hours
    ? t('ownerBusiness.openToday', { hours })
    : t('ownerBusiness.closedToday');

  return (
    <OwnerPage title={t('owner.business')} subtitle={t('ownerLead.business')}>
      <DeskWait loading={data.isLoading} error={data.isError} onRetry={() => void data.refetch()}>
        {business ? (
          <BusinessDetails
            key={business.name}
            business={business}
            tax={venue.data ? <TaxSection venue={venue.data} tin={business.tin ?? null} /> : null}
          />
        ) : null}

        <View style={styles.list}>
          <SectionHead
            title={t('ownerBusiness.locationsLabel')}
            badge={String(locations.length)}
            badgeTone="neutral"
          />
          <View style={[cardStyle(theme), styles.card]}>
            {locations.map((location, i) => (
              <LocationCard
                key={location.id}
                location={location}
                first={i === 0}
                active={location.id === venueId}
                today={location.id === venueId && venue.data ? todayLabel : undefined}
                onEdit={() => setEditing(location)}
                onSwitch={() => {
                  switchVenue(location.id);
                  toast.success(t('ownerBusiness.switched', { name: location.name }));
                }}
              />
            ))}
          </View>
          <AddDashed label={t('ownerBusiness.addLocation')} onPress={() => setEditing(null)} />
        </View>
        {current ? <LocationDetails key={current.id} location={current} /> : null}
        {venue.data ? (
          <>
            <HoursSection key={venue.data.id} venue={venue.data} />
            <ClosedDays venue={venue.data} />
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
  list: { gap: tokens.owner.controls.listGap },
  card: { overflow: 'hidden' },
});
