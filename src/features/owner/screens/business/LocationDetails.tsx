import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { GeoPoint, Location } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { useDraft } from '../../data/useDraft';
import { ownerKeys } from '../../data/keys';
import { Field, TitledSection, toast } from '../../kit';
import { LocationMap } from './LocationMap';

// GhanaPostGPS codes look like GA-123-4567; riders use them to find the venue.
const DIGITAL = /^[A-Z]{2}-\d{3,4}-\d{4}$/;

/** The location in use, edited in place (canvas): name, phone, addresses and the map pin. */
export function LocationDetails({ location }: { location: Location }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const draft = useDraft({
    name: location.name,
    phone: location.phone ?? '',
    address1: location.address1 ?? '',
    digital: location.digitalAddress ?? '',
    geo: (location.geo ?? null) as GeoPoint | null,
  });
  const f = draft.value;
  const digital = f.digital.trim().toUpperCase();
  const digitalBad = digital !== '' && !DIGITAL.test(digital);
  const save = useMutation({
    mutationFn: () =>
      api.ownerUpdateLocation(location.id, {
        name: f.name.trim(),
        phone: f.phone.trim(),
        address1: f.address1.trim(),
        digitalAddress: digital || null,
        ...(f.geo ? { geo: f.geo } : {}),
      }),
    onSuccess: () => {
      toast.success(t('ownerKit.saved'));
      draft.reset();
      void client.invalidateQueries({ queryKey: ownerKeys.business() });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const submit = () => {
    if (!f.name.trim()) return toast.error(t('ownerBusiness.needName'));
    if (digitalBad) return toast.error(t('ownerBusiness.digitalError'));
    save.mutate();
  };
  return (
    <TitledSection title={location.name} cardStyle={styles.card}>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label={t('ownerBusiness.locationName')}
            value={f.name}
            onChangeText={(v) => draft.set('name', v)}
          />
        </View>
        <View style={styles.half}>
          <Field
            label={t('ownerBusiness.locationPhone')}
            keyboardType="phone-pad"
            value={f.phone}
            onChangeText={(v) => draft.set('phone', v)}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label={t('ownerBusiness.street')}
            value={f.address1}
            onChangeText={(v) => draft.set('address1', v)}
          />
        </View>
        <View style={styles.half}>
          <Field
            label={t('ownerBusiness.digital')}
            hint={t('ownerBusiness.digitalHint')}
            autoCapitalize="characters"
            value={f.digital}
            onChangeText={(v) => draft.set('digital', v)}
            error={digitalBad ? t('ownerBusiness.digitalError') : undefined}
          />
        </View>
      </View>
      <LocationMap geo={f.geo} onChange={(geo) => draft.set('geo', geo)} />
      {draft.dirty ? (
        <View style={styles.end}>
          <Button
            label={t('ownerBusiness.saveLocation')}
            tone="secondary"
            loading={save.isPending}
            onPress={submit}
          />
        </View>
      ) : null}
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  // Canvas: these fields sit straight on the page, like the business details above.
  card: {
    padding: 0,
    gap: tokens.space[4],
    borderWidth: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[4] },
  half: { flexGrow: 1, flexBasis: 220, minWidth: 0 },
  end: { alignItems: 'flex-end' },
});
