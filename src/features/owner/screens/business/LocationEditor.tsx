import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { Location } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { ownerKeys } from '../../data/keys';
import { Field, ModalSheet, Section, SwitchRow, toast } from '../../kit';

/** Add a location, or edit one. A new one can be a branch of this business or a separate business. */
export function LocationEditor({
  location,
  onClose,
}: {
  location: Location | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [name, setName] = useState(location?.name ?? '');
  const [address1, setAddress1] = useState(location?.address1 ?? '');
  const [city, setCity] = useState(location?.city ?? '');
  const [postcode, setPostcode] = useState(location?.postcode ?? '');
  const [country, setCountry] = useState(location?.country ?? 'Ghana');
  const [phone, setPhone] = useState(location?.phone ?? '');
  const [email, setEmail] = useState(location?.email ?? '');
  const [separate, setSeparate] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const valid = Boolean(name.trim() && country.trim());

  const save = useMutation({
    mutationFn: () => {
      const base = {
        name: name.trim(),
        address1: address1.trim(),
        city: city.trim(),
        postcode: postcode.trim(),
        country: country.trim(),
      };
      return location
        ? api.ownerUpdateLocation(location.id, {
            ...base,
            phone: phone.trim(),
            email: email.trim(),
          })
        : api.ownerCreateLocation({ ...base, isSeparateBusiness: separate });
    },
    onSuccess: () => {
      toast.success(location ? t('ownerKit.saved') : t('ownerBusiness.added'));
      void client.invalidateQueries({ queryKey: ownerKeys.business() });
      onClose();
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  return (
    <ModalSheet
      visible
      fullScreen
      onClose={onClose}
      title={location ? t('ownerBusiness.editLocation') : t('ownerBusiness.addLocation')}
      footer={
        <Button
          label={t('ownerKit.save')}
          style={styles.flex}
          loading={save.isPending}
          onPress={() => (valid ? save.mutate() : setShowErrors(true))}
        />
      }
    >
      <Field
        label={t('ownerBusiness.locationName')}
        value={name}
        onChangeText={setName}
        placeholder={t('ownerBusiness.locationNameHint')}
        error={showErrors && !name.trim() ? t('ownerBusiness.needName') : undefined}
      />
      <Field
        label={t('ownerBusiness.address')}
        value={address1}
        onChangeText={setAddress1}
        autoComplete="street-address"
        textContentType="streetAddressLine1"
      />
      <View style={styles.row}>
        <Field
          label={t('ownerBusiness.city')}
          value={city}
          onChangeText={setCity}
          textContentType="addressCity"
        />
        <Field
          label={t('ownerBusiness.postcode')}
          value={postcode}
          onChangeText={setPostcode}
          autoCapitalize="characters"
          textContentType="postalCode"
        />
      </View>
      <Field
        label={t('ownerBusiness.country')}
        value={country}
        onChangeText={setCountry}
        error={showErrors && !country.trim() ? t('ownerBusiness.needCountry') : undefined}
      />
      {location ? (
        <>
          <Field
            label={t('ownerBusiness.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />
          <Field
            label={t('ownerBusiness.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
          />
        </>
      ) : (
        <Section>
          <SwitchRow
            label={t('ownerBusiness.separate')}
            hint={t('ownerBusiness.separateHint')}
            value={separate}
            onChange={setSeparate}
          />
        </Section>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: tokens.space[3] },
});
