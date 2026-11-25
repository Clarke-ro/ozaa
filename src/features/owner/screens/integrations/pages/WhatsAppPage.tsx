import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { VenueSettings } from '@/lib/api/types';
import { formatPhone } from '@/lib/phone';
import { Button } from '@/ui/Button';
import { DeskWait } from '../../../chrome/OwnerPage';
import { ownerKeys } from '../../../data/keys';
import { useSaveVenue } from '../../../data/useSaveVenue';
import { Field, Section, SectionBody } from '../../../kit';
import { alertsPatch } from '../whatsappAlerts';
import type { PageProps } from './IntegrationPage';

/** WhatsApp order alerts (BUILD.md 4b.18): the number they go to. Saving turns them on. */
export function WhatsAppPage({ venueId, done }: PageProps) {
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  return (
    <DeskWait loading={venue.isPending} error={venue.isError} onRetry={() => void venue.refetch()}>
      {venue.data ? <AlertsForm venue={venue.data} done={done} /> : null}
    </DeskWait>
  );
}

function AlertsForm({ venue, done }: { venue: VenueSettings; done: () => void }) {
  const { t } = useTranslation();
  const saved = venue.whatsappAlerts ?? null;
  const [typed, setTyped] = useState(saved ? formatPhone(saved) : '');
  const [tried, setTried] = useState(false);
  const save = useSaveVenue(venue.id);
  const check = alertsPatch(true, typed);
  return (
    <Section>
      <SectionBody>
        <Field
          label={t('ownerPay.alertsNumber')}
          value={typed}
          onChangeText={setTyped}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="024 123 4567"
          error={tried && !check.ok ? t('ownerPay.alertsError') : undefined}
        />
        <Button
          label={t('ownerPay.alertsSave')}
          loading={save.isPending}
          size="md"
          style={styles.save}
          onPress={() =>
            check.ok ? save.mutate(check.patch, { onSuccess: done }) : setTried(true)
          }
        />
      </SectionBody>
    </Section>
  );
}

const styles = StyleSheet.create({
  save: { alignSelf: 'flex-end' },
});
