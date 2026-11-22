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
import { SaveBar, Section, SectionBody, Stepper, SwitchRow, toast } from '../../kit';
import { MoneyInput, SettingRow } from './SettingRow';
import { Button } from '@/ui/Button';
import { hereOnce } from '@/lib/here';

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
  // "GH₵" for the money boxes: the currency's own symbol, without the number.
  const symbol = money(0).replace(/[\d.,\s]/g, '');
  const example = check.ok ? deliveryQuote(check.settings, EXAMPLE_KM, EXAMPLE_FOOD) : null;
  const noPin = f.deliveryOn && (v?.location.lat == null || v.location.lng == null);

  const [locating, setLocating] = useState(false);
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
      subtitle={t('ownerLead.ordering')}
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
        loading={venue.isPending}
        error={venue.isError}
        onRetry={() => void venue.refetch()}
      >
        <Section note={error('method')}>
          <SwitchRow
            icon={ShoppingBag}
            label={t('ownerOrdering.main')}
            hint={t('ownerOrdering.mainHint')}
            value={f.enabled}
            onChange={(on) => draft.set('enabled', on)}
          />
        </Section>

        <View style={styles.methods}>
          <View>
            <Section title={t('ownerOrdering.pickup')}>
              <SwitchRow
                icon={Store}
                label={t('ownerOrdering.pickupOn')}
                value={f.pickupOn}
                onChange={(on) => draft.set('pickupOn', on)}
              />
              {f.pickupOn ? (
                <SectionBody>
                  <SettingRow
                    label={t('ownerOrdering.readyIn')}
                    hint={t('ownerOrdering.readyInHint')}
                    error={error('prep')}
                  >
                    <Stepper
                      label={t('ownerOrdering.readyIn')}
                      value={Number.parseInt(f.prepMinutes, 10) || 0}
                      min={5}
                      max={180}
                      step={5}
                      unit={t('ownerOrdering.min')}
                      onChange={(n) => draft.set('prepMinutes', String(n))}
                    />
                  </SettingRow>
                </SectionBody>
              ) : null}
            </Section>
          </View>

          <View>
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
                    <SettingRow
                      label={t('ownerOrdering.fee')}
                      hint={t('ownerOrdering.feeHint')}
                      error={error('minimumFee')}
                    >
                      <MoneyInput
                        label={t('ownerOrdering.fee')}
                        currency={symbol}
                        value={f.minimumFee}
                        onChange={(text) => draft.set('minimumFee', text)}
                        placeholder="10"
                      />
                    </SettingRow>
                    <SettingRow
                      label={t('ownerOrdering.perKmShort')}
                      hint={t('ownerOrdering.perKmHint')}
                      error={error('perKm')}
                    >
                      <MoneyInput
                        label={t('ownerOrdering.perKmShort')}
                        currency={symbol}
                        value={f.perKm}
                        onChange={(text) => draft.set('perKm', text)}
                        placeholder="0"
                      />
                    </SettingRow>
                    <SettingRow
                      label={t('ownerOrdering.freeOverShort')}
                      hint={t('ownerOrdering.freeOverHint')}
                      error={error('freeOver')}
                    >
                      <MoneyInput
                        label={t('ownerOrdering.freeOverShort')}
                        currency={symbol}
                        value={f.freeOver}
                        onChange={(text) => draft.set('freeOver', text)}
                      />
                    </SettingRow>
                    <SettingRow
                      label={t('ownerOrdering.upTo')}
                      hint={t('ownerOrdering.from', { place: v?.name ?? '' })}
                      error={error('maxKm')}
                    >
                      <Stepper
                        label={t('ownerOrdering.upTo')}
                        value={Number.parseFloat(f.maxKm) || 0}
                        min={1}
                        max={50}
                        unit={t('ownerOrdering.km')}
                        onChange={(n) => draft.set('maxKm', String(n))}
                      />
                    </SettingRow>
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
          </View>
        </View>
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('ownerOrdering.footnote')}
        </Text>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  methods: { gap: tokens.space[5] },
  stack: { gap: tokens.space[1] },
  pin: { gap: tokens.space[2], alignItems: 'flex-start' },
});
