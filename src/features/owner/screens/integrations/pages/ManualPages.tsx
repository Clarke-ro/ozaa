import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ManualPayments } from '@/lib/api/types';
import { asGhanaPhone, formatPhone, parseGhanaPhone } from '@/lib/phone';
import { checkManualPayments } from '@/lib/payments';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { DeskWait } from '../../../chrome/OwnerPage';
import { Chips, Field, TitledSection } from '../../../kit';
import { FormLabel } from '../../menu/FormLabel';
import { fieldStyles } from '../../menu/fieldStyles';
import { usePayments } from '../usePayments';
import type { PageProps } from './IntegrationPage';

type Network = NonNullable<ManualPayments['momo']['network']>;
const NETWORKS: Network[] = ['mtn', 'vod', 'atl'];

/** Bank transfer: the account guests send to. Saving turns it on and returns to the list. */
export function BankPage({ venueId, done }: PageProps) {
  const pay = usePayments(venueId);
  const saved = pay.settings.data?.manual;
  return (
    <DeskWait
      loading={pay.settings.isPending}
      error={pay.settings.isError}
      onRetry={() => void pay.settings.refetch()}
    >
      {saved ? <BankForm saved={saved} pay={pay} done={done} /> : null}
    </DeskWait>
  );
}

function BankForm({
  saved,
  pay,
  done,
}: {
  saved: ManualPayments;
  pay: ReturnType<typeof usePayments>;
  done: () => void;
}) {
  const { t } = useTranslation();
  const [bank, setBank] = useState(saved.bankTransfer);
  const [tried, setTried] = useState(false);
  const next: ManualPayments = { ...saved, bankTransfer: { ...bank, enabled: true } };
  const check = checkManualPayments(next);
  return (
    <TitledSection plain title={t('ownerPay.account')}>
      <Field
        label={t('ownerPay.bankName')}
        value={bank.bankName ?? ''}
        onChangeText={(bankName) => setBank({ ...bank, bankName })}
        placeholder="GCB Bank"
      />
      <View style={fieldStyles.pair}>
        <View style={fieldStyles.half}>
          <Field
            label={t('ownerPay.accountName')}
            value={bank.accountName ?? ''}
            onChangeText={(accountName) => setBank({ ...bank, accountName })}
          />
        </View>
        <View style={fieldStyles.half}>
          <Field
            label={t('ownerPay.accountNumber')}
            value={bank.accountNumber ?? ''}
            onChangeText={(accountNumber) => setBank({ ...bank, accountNumber })}
            keyboardType="number-pad"
            placeholder="1234567890"
            error={tried && !check.ok ? t('ownerPay.err.bank') : undefined}
          />
        </View>
      </View>
      <Button
        label={t('ownerPay.saveBank')}
        loading={pay.setManual.isPending}
        style={styles.save}
        onPress={() =>
          check.ok ? pay.setManual.mutate(next, { onSuccess: done }) : setTried(true)
        }
      />
    </TitledSection>
  );
}

/** MoMo to the venue's own number: network, number and the name guests see. */
export function MomoPage({ venueId, done }: PageProps) {
  const pay = usePayments(venueId);
  const saved = pay.settings.data?.manual;
  return (
    <DeskWait
      loading={pay.settings.isPending}
      error={pay.settings.isError}
      onRetry={() => void pay.settings.refetch()}
    >
      {saved ? <MomoForm saved={saved} pay={pay} done={done} /> : null}
    </DeskWait>
  );
}

function MomoForm({
  saved,
  pay,
  done,
}: {
  saved: ManualPayments;
  pay: ReturnType<typeof usePayments>;
  done: () => void;
}) {
  const { t } = useTranslation();
  const [momo, setMomo] = useState(saved.momo);
  // Typed as the owner says it ("024 …") and turned into +233 on save.
  const [text, setText] = useState(saved.momo.number ? formatPhone(saved.momo.number) : '');
  const [tried, setTried] = useState(false);
  const number = asGhanaPhone(parseGhanaPhone(text)) ?? undefined;
  const next: ManualPayments = { ...saved, momo: { ...momo, number, enabled: true } };
  const check = checkManualPayments(next);
  return (
    <TitledSection plain title={t('ownerPay.account')}>
      <View style={fieldStyles.block}>
        <FormLabel>{t('ownerPay.network')}</FormLabel>
        <Chips
          single
          label={t('ownerPay.network')}
          options={NETWORKS.map((id) => ({ id, label: t(`ownerPay.networks.${id}`) }))}
          selected={momo.network ? [momo.network] : []}
          onChange={(ids) => setMomo({ ...momo, network: ids[0] })}
        />
      </View>
      <View style={fieldStyles.pair}>
        <View style={fieldStyles.half}>
          <Field
            label={t('ownerPay.momoNumber')}
            value={text}
            onChangeText={setText}
            keyboardType="phone-pad"
            placeholder="024 123 4567"
            error={tried && !check.ok ? t('ownerPay.err.momo') : undefined}
          />
        </View>
        <View style={fieldStyles.half}>
          <Field
            label={t('ownerPay.momoName')}
            value={momo.name ?? ''}
            onChangeText={(name) => setMomo({ ...momo, name })}
          />
        </View>
      </View>
      <Button
        label={t('ownerPay.saveMomo')}
        loading={pay.setManual.isPending}
        style={styles.save}
        onPress={() =>
          check.ok ? pay.setManual.mutate(next, { onSuccess: done }) : setTried(true)
        }
      />
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  save: { alignSelf: 'flex-start', marginTop: tokens.space[2] },
});
