import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bike, ShoppingBag, Store } from 'lucide-react-native';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { deliveryQuote } from '@/lib/onlineOrdering';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useDraft } from '../../data/useDraft';
import { useSaveVenue } from '../../data/useSaveVenue';
import { checkOrdering, orderingDraftOf, type OrderingDraft } from '../../desk/orderingForm';
import { Field, SaveBar, Section, SectionBody, SwitchRow, toast } from '../../kit';
import { Button } from '@/ui/Button';
import { hereOnce } from '@/lib/here';

// The worked example under the delivery fields: a typical short trip and a typical order.
const EXAMPLE_KM = 3;
const EXAMPLE_FOOD = 5000;

/** Orders from the menu link: on or off, pickup with a prep time, delivery with its fees. */
export function OnlineOrderingScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const v = venue.data;
  const draft = useDraft<OrderingDraft>(orderingDraftOf(v?.onlineOrdering));
  const [showErrors, setShowErrors] = useState(false);
  const save = useSaveVenue(venueId, () => {
    setShowErrors(false);
    draft.reset();
  });
  const f = draft.value;
  const check = checkOrdering(f);
  const error = (field: string) =>
    showErrors && !check.ok && check.field === field ? t(`ownerOrdering.err.${field}`) : undefined;
  const money = (amount: number) => formatMoney(pesewas(amount), v?.currency);
  const example = check.ok ? deliveryQuote(check.settings, EXAMPLE_KM, EXAMPLE_FOOD) : null;
  // Delivery distance is measured from the venue's map pin.
  const noPin = f.deliveryOn && (v?.location.lat == null || v.location.lng == null);

  const [locating, setLocating] = useState(false);
  // The venue's map pin: the owner stands in the venue and taps once. Delivery distance starts here.
  const setPin = async () => {
    if (!v) return;
    setLocating(true);
    const here = await hereOnce();
    setLocating(false);
    if (!here.ok) {
      toast.error(t(`linkOrder.locate.${here.reason}`));
      return;
    }
    save.mutate({ location: { label: v.location.label, ...here.point } });
  };

  const submit = () => {
    if (!check.ok) {
      setShowErrors(true);
      return;
    }
    save.mutate({ onlineOrdering: check.settings });
  };

  return (
    <OwnerPage
      title={t('owner.ordering')}
      subtitle={t('ownerOrdering.lead')}
      footer={
        <SaveBar
          visible={draft.dirty}
          saving={save.isPending}
          onDiscard={() => {
            draft.reset();
            setShowErrors(false);
          }}
          onSave={submit}
        />
      }
    >
      <DeskWait
        loading={venue.isLoading}
        error={venue.isError}
        onRetry={() => void venue.refetch()}
      >
        <Section note={error('method') ?? t('ownerOrdering.mainNote')}>
          <SwitchRow
            icon={ShoppingBag}
            label={t('ownerOrdering.main')}
            hint={f.enabled ? t('ownerOrdering.mainOn') : t('ownerOrdering.mainOff')}
            value={f.enabled}
            onChange={(on) => draft.set('enabled', on)}
          />
        </Section>

        <Section title={t('ownerOrdering.pickup')}>
          <SwitchRow
            icon={Store}
            label={t('ownerOrdering.pickupOn')}
            value={f.pickupOn}
            onChange={(on) => draft.set('pickupOn', on)}
          />
          {f.pickupOn ? (
            <SectionBody>
              <Field
                label={t('ownerOrdering.prep')}
                hint={t('ownerOrdering.prepHint')}
                value={f.prepMinutes}
                onChangeText={(text) => draft.set('prepMinutes', text)}
                keyboardType="number-pad"
                placeholder="20"
                error={error('prep')}
              />
            </SectionBody>
          ) : null}
        </Section>

        <Section title={t('ownerOrdering.delivery')}>
          <SwitchRow
            icon={Bike}
            label={t('ownerOrdering.deliveryOn')}
            value={f.deliveryOn}
            onChange={(on) => draft.set('deliveryOn', on)}
          />
          {f.deliveryOn ? (
            <SectionBody>
              <View style={styles.stack}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Field
                      label={t('ownerOrdering.minimumFee', { currency: v?.currency })}
                      value={f.minimumFee}
                      onChangeText={(text) => draft.set('minimumFee', text)}
                      keyboardType="decimal-pad"
                      placeholder="10.00"
                      error={error('minimumFee')}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Field
                      label={t('ownerOrdering.perKm', { currency: v?.currency })}
                      value={f.perKm}
                      onChangeText={(text) => draft.set('perKm', text)}
                      keyboardType="decimal-pad"
                      placeholder="2.50"
                      error={error('perKm')}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Field
                      label={t('ownerOrdering.maxKm')}
                      value={f.maxKm}
                      onChangeText={(text) => draft.set('maxKm', text)}
                      keyboardType="decimal-pad"
                      placeholder="8"
                      error={error('maxKm')}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Field
                      label={t('ownerOrdering.freeOver', { currency: v?.currency })}
                      hint={t('ownerOrdering.freeOverHint')}
                      value={f.freeOver}
                      onChangeText={(text) => draft.set('freeOver', text)}
                      keyboardType="decimal-pad"
                      placeholder="200.00"
                      error={error('freeOver')}
                    />
                  </View>
                </View>
                {example?.ok ? (
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {t('ownerOrdering.example', {
                      km: EXAMPLE_KM,
                      food: money(EXAMPLE_FOOD),
                      fee:
                        example.feePesewas === 0
                          ? t('ownerOrdering.free')
                          : money(example.feePesewas),
                    })}
                  </Text>
                ) : null}
                <View style={styles.pin}>
                  <Text variant="caption" style={{ color: noPin ? theme.warning : theme.meta }}>
                    {noPin ? t('ownerOrdering.noPin') : t('ownerOrdering.pinSet')}
                  </Text>
                  <Button
                    label={noPin ? t('ownerOrdering.setPin') : t('ownerOrdering.movePin')}
                    tone="secondary"
                    size="md"
                    loading={locating}
                    onPress={() => void setPin()}
                  />
                </View>
              </View>
            </SectionBody>
          ) : null}
        </Section>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  row: { flexDirection: 'row', gap: tokens.space[3] },
  // minWidth 0 lets two fields share a phone-width row on the web.
  flex: { flex: 1, minWidth: 0 },
  pin: { gap: tokens.space[2], alignItems: 'flex-start' },
});
