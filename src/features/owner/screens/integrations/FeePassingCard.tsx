import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Percent } from 'lucide-react-native';
import { api } from '@/lib/api';
import { toMessageKey } from '@/lib/api/errors';
import type { FeePassing, PaymentSettings } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { passedFee } from '@/lib/paystackFee';
import { guestKeys } from '@/lib/queryKeys';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { Chips, toast } from '../../kit';
import { IntegrationCard } from './IntegrationCard';

// The shares offered. 100% means the venue still receives the whole bill (paystackFee.ts).
const SHARES = [25, 50, 75, 100] as const;
// The example bill under the choices: GH₵100.
const EXAMPLE_BILL = 10_000;

/**
 * "Pass fees to customers" (BUILD.md section 4): the owner switches it on and picks how much of
 * Paystack's fee guests pay on card and MoMo in the app. It never applies to cash, card machine,
 * bank transfer or MoMo to the venue's own number. Saves on every change, like the other switches.
 */
export function FeePassingCard({
  venueId,
  settings,
}: {
  venueId: string;
  settings: PaymentSettings;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const [draft, setDraft] = useState<FeePassing>(
    settings.feePassing ?? { enabled: false, percent: 100 },
  );

  const save = useMutation({
    mutationFn: (body: FeePassing) => api.ownerSetFeePassing(venueId, body),
    onSuccess: (result) => {
      client.setQueryData(ownerKeys.paymentSettings(venueId), result);
      // Guests read the share from the venue, so their Pay screen shows the new fee line.
      void client.invalidateQueries({ queryKey: guestKeys.venueAll() });
      toast.success(t('ownerKit.saved'));
    },
    onError: (error) => {
      setDraft(settings.feePassing ?? { enabled: false, percent: 100 });
      toast.error(t(toMessageKey(error)));
    },
  });
  const change = (next: FeePassing) => {
    setDraft(next);
    save.mutate(next);
  };
  const example = formatMoney(pesewas(passedFee(EXAMPLE_BILL, draft.percent)), DEFAULT_CURRENCY);

  return (
    <IntegrationCard
      icon={Percent}
      title={t('ownerPay.feesTitle')}
      subtitle={t('ownerPay.feesSub')}
      status={draft.enabled ? t('ownerPay.on') : t('ownerPay.off')}
      on={draft.enabled}
      onToggle={(enabled) => change({ ...draft, enabled })}
    >
      {draft.enabled ? (
        <View style={styles.stack}>
          <Chips
            single
            label={t('ownerPay.feesShare')}
            options={SHARES.map((share) => ({ id: String(share), label: `${share}%` }))}
            selected={[String(draft.percent)]}
            onChange={(ids) => {
              const percent = Number(ids[0]);
              if (percent && percent !== draft.percent) change({ ...draft, percent });
            }}
          />
          <Text style={[styles.note, { color: theme.meta }]}>
            {t('ownerPay.feesExample', {
              bill: formatMoney(pesewas(EXAMPLE_BILL), DEFAULT_CURRENCY),
              fee: example,
            })}
          </Text>
        </View>
      ) : null}
    </IntegrationCard>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  note: { fontSize: 13, lineHeight: 18 },
});
