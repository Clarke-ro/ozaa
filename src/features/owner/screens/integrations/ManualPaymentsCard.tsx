import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard, Landmark, Smartphone } from 'lucide-react-native';
import { api } from '@/lib/api';
import { toMessageKey } from '@/lib/api/errors';
import type { ManualPayments, PaymentSettings } from '@/lib/api/types';
import { asGhanaPhone, formatPhone, parseGhanaPhone } from '@/lib/phone';
import { checkManualPayments } from '@/lib/payments';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { guestKeys } from '@/lib/queryKeys';
import { ownerKeys } from '../../data/keys';
import { Chips, Field, Section, SectionBody, SwitchRow, toast } from '../../kit';

type Network = NonNullable<ManualPayments['momo']['network']>;
const NETWORKS: Network[] = ['mtn', 'vod', 'atl'];

/** Cash, card machine, bank transfer and MoMo to the venue's number. Staff mark these paid by hand. */
export function ManualPaymentsCard({
  venueId,
  settings,
}: {
  venueId: string;
  settings: PaymentSettings;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const saved = settings.manual;
  const [draft, setDraft] = useState<ManualPayments>(saved);
  // The MoMo number is typed as the owner says it ("024 …") and turned into +233 on save.
  const [momoText, setMomoText] = useState(saved.momo.number ? formatPhone(saved.momo.number) : '');
  const [tried, setTried] = useState(false);
  const momoNumber = asGhanaPhone(parseGhanaPhone(momoText)) ?? undefined;
  const next: ManualPayments = { ...draft, momo: { ...draft.momo, number: momoNumber } };
  const check = checkManualPayments(next);
  const dirty = JSON.stringify(next) !== JSON.stringify(saved);

  const save = useMutation({
    mutationFn: () => api.ownerSetManualPayments(venueId, next),
    onSuccess: (result) => {
      client.setQueryData(ownerKeys.paymentSettings(venueId), result);
      void client.invalidateQueries({ queryKey: ownerKeys.venue(venueId) });
      void client.invalidateQueries({ queryKey: guestKeys.venueAll() });
      setTried(false);
      toast.success(t('ownerKit.saved'));
    },
    onError: (error) => toast.error(t(toMessageKey(error))),
  });
  const set = (changes: Partial<ManualPayments>) => setDraft({ ...draft, ...changes });
  const error = (field: 'bank' | 'momo') =>
    tried && !check.ok && check.field === field ? t(`ownerPay.err.${field}`) : undefined;

  return (
    <Section
      title={t('ownerPay.manual')}
      subtitle={t('ownerPay.manualNote')}
      icon={Banknote}
      collapsible
    >
      <SwitchRow
        icon={Banknote}
        label={t('ownerPay.cash')}
        value={draft.cash}
        onChange={(cash) => set({ cash })}
      />
      <SwitchRow
        icon={CreditCard}
        label={t('ownerPay.cardMachine')}
        hint={t('ownerPay.cardMachineHint')}
        value={draft.cardMachine}
        onChange={(cardMachine) => set({ cardMachine })}
      />
      <SwitchRow
        icon={Landmark}
        label={t('ownerPay.bank')}
        value={draft.bankTransfer.enabled}
        onChange={(enabled) => set({ bankTransfer: { ...draft.bankTransfer, enabled } })}
      />
      {draft.bankTransfer.enabled ? (
        <SectionBody>
          <View style={styles.stack}>
            <Field
              label={t('ownerPay.bankName')}
              value={draft.bankTransfer.bankName ?? ''}
              onChangeText={(bankName) =>
                set({ bankTransfer: { ...draft.bankTransfer, bankName } })
              }
              placeholder="GCB Bank"
            />
            <Field
              label={t('ownerPay.accountName')}
              value={draft.bankTransfer.accountName ?? ''}
              onChangeText={(accountName) =>
                set({ bankTransfer: { ...draft.bankTransfer, accountName } })
              }
            />
            <Field
              label={t('ownerPay.accountNumber')}
              value={draft.bankTransfer.accountNumber ?? ''}
              onChangeText={(accountNumber) =>
                set({ bankTransfer: { ...draft.bankTransfer, accountNumber } })
              }
              keyboardType="number-pad"
              error={error('bank')}
            />
          </View>
        </SectionBody>
      ) : null}
      <SwitchRow
        icon={Smartphone}
        label={t('ownerPay.momo')}
        hint={t('ownerPay.momoHint')}
        value={draft.momo.enabled}
        onChange={(enabled) => set({ momo: { ...draft.momo, enabled } })}
      />
      {draft.momo.enabled ? (
        <SectionBody>
          <View style={styles.stack}>
            <Chips
              single
              label={t('ownerPay.network')}
              options={NETWORKS.map((id) => ({ id, label: t(`ownerPay.networks.${id}`) }))}
              selected={draft.momo.network ? [draft.momo.network] : []}
              onChange={(ids) => set({ momo: { ...draft.momo, network: ids[0] } })}
            />
            <Field
              label={t('ownerPay.momoNumber')}
              value={momoText}
              onChangeText={setMomoText}
              keyboardType="phone-pad"
              placeholder="024 123 4567"
              error={error('momo')}
            />
            <Field
              label={t('ownerPay.momoName')}
              hint={t('ownerPay.momoNameHint')}
              value={draft.momo.name ?? ''}
              onChangeText={(name) => set({ momo: { ...draft.momo, name } })}
            />
          </View>
        </SectionBody>
      ) : null}
      {dirty ? (
        <SectionBody>
          <Button
            label={t('ownerPay.saveManual')}
            tone="secondary"
            loading={save.isPending}
            onPress={() => (check.ok ? save.mutate() : setTried(true))}
          />
        </SectionBody>
      ) : null}
      {tried && !check.ok ? (
        <Text variant="caption" style={[styles.pad, { color: theme.error }]}>
          {t(`ownerPay.err.${check.field}`)}
        </Text>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  pad: { paddingHorizontal: tokens.space[4] },
});
