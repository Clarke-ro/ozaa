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
import { Chips, Field, toast } from '../../kit';
import { IntegrationCard } from './IntegrationCard';

type Network = NonNullable<ManualPayments['momo']['network']>;
const NETWORKS: Network[] = ['mtn', 'vod', 'atl'];

/**
 * Cash, card machine, bank transfer and MoMo to the venue's number, each as its own card with a
 * switch (design canvas). Staff mark these orders paid by hand.
 */
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
    mutationFn: (body: ManualPayments) => api.ownerSetManualPayments(venueId, body),
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

  // Switching a method saves straight away; bank and MoMo details save with their own button.
  const flip = (changes: Partial<ManualPayments>) => {
    const after = { ...draft, ...changes };
    setDraft(after);
    const quick = { ...after, momo: { ...after.momo, number: momoNumber } };
    if (checkManualPayments(quick).ok) save.mutate(quick);
  };
  const saveRow = (label: string, note: string) => (
    <View style={styles.foot}>
      <Text style={[styles.note, { color: theme.meta }]}>{note}</Text>
      <Button
        label={label}
        loading={save.isPending}
        disabled={!dirty}
        onPress={() => (check.ok ? save.mutate(next) : setTried(true))}
      />
    </View>
  );
  const onOff = (on: boolean) => (on ? t('ownerPay.on') : t('ownerPay.off'));

  return (
    <>
      <IntegrationCard
        icon={Banknote}
        title={t('ownerPay.cash')}
        subtitle={t('ownerPay.cashSub')}
        status={onOff(draft.cash)}
        on={draft.cash}
        onToggle={(cash) => flip({ cash })}
      />
      <IntegrationCard
        icon={CreditCard}
        title={t('ownerPay.cardMachine')}
        subtitle={t('ownerPay.cardMachineHint')}
        status={onOff(draft.cardMachine)}
        on={draft.cardMachine}
        onToggle={(cardMachine) => flip({ cardMachine })}
      />
      <IntegrationCard
        icon={Landmark}
        title={t('ownerPay.bank')}
        subtitle={t('ownerPay.bankSub')}
        status={draft.bankTransfer.enabled ? t('ownerPay.on') : t('ownerPay.notConnected')}
        on={draft.bankTransfer.enabled}
        onToggle={(enabled) =>
          enabled
            ? set({ bankTransfer: { ...draft.bankTransfer, enabled } })
            : flip({ bankTransfer: { ...draft.bankTransfer, enabled } })
        }
      >
        <View style={styles.pair}>
          <View style={styles.half}>
            <Field
              label={t('ownerPay.bankName')}
              value={draft.bankTransfer.bankName ?? ''}
              onChangeText={(bankName) =>
                set({ bankTransfer: { ...draft.bankTransfer, bankName } })
              }
              placeholder="GCB Bank"
            />
          </View>
          <View style={styles.half}>
            <Field
              label={t('ownerPay.accountName')}
              value={draft.bankTransfer.accountName ?? ''}
              onChangeText={(accountName) =>
                set({ bankTransfer: { ...draft.bankTransfer, accountName } })
              }
            />
          </View>
        </View>
        <View style={styles.half}>
          <Field
            label={t('ownerPay.accountNumber')}
            value={draft.bankTransfer.accountNumber ?? ''}
            onChangeText={(accountNumber) =>
              set({ bankTransfer: { ...draft.bankTransfer, accountNumber } })
            }
            keyboardType="number-pad"
            placeholder="1234567890"
            error={error('bank')}
          />
        </View>
        {saveRow(t('ownerPay.saveBank'), t('ownerPay.bankNote'))}
      </IntegrationCard>
      <IntegrationCard
        icon={Smartphone}
        title={t('ownerPay.momo')}
        subtitle={t('ownerPay.momoHint')}
        status={draft.momo.enabled ? t('ownerPay.on') : t('ownerPay.notConnected')}
        on={draft.momo.enabled}
        onToggle={(enabled) =>
          enabled
            ? set({ momo: { ...draft.momo, enabled } })
            : flip({ momo: { ...draft.momo, enabled } })
        }
      >
        <Chips
          single
          label={t('ownerPay.network')}
          options={NETWORKS.map((id) => ({ id, label: t(`ownerPay.networks.${id}`) }))}
          selected={draft.momo.network ? [draft.momo.network] : []}
          onChange={(ids) => set({ momo: { ...draft.momo, network: ids[0] } })}
        />
        <View style={styles.pair}>
          <View style={styles.half}>
            <Field
              label={t('ownerPay.momoNumber')}
              value={momoText}
              onChangeText={setMomoText}
              keyboardType="phone-pad"
              placeholder="024 123 4567"
              error={error('momo')}
            />
          </View>
          <View style={styles.half}>
            <Field
              label={t('ownerPay.momoName')}
              value={draft.momo.name ?? ''}
              onChangeText={(name) => set({ momo: { ...draft.momo, name } })}
            />
          </View>
        </View>
        {saveRow(t('ownerPay.saveMomo'), t('ownerPay.momoNameHint'))}
      </IntegrationCard>
    </>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[4] },
  half: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
  foot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: tokens.space[3],
  },
  note: { flexGrow: 1, flexBasis: 240, fontSize: 13, lineHeight: 18 },
});
