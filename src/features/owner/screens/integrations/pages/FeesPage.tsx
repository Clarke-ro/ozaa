import { useTranslation } from 'react-i18next';
import type { FeePassing } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { passedFee } from '@/lib/paystackFee';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait } from '../../../chrome/OwnerPage';
import { Chips, TitledSection } from '../../../kit';
import { usePayments } from '../usePayments';
import type { PageProps } from './IntegrationPage';

// The shares offered. 100% means the venue still receives the whole bill (paystackFee.ts).
const SHARES = [25, 50, 75, 100] as const;
// The example bill under the choices: GH₵100.
const EXAMPLE_BILL = 10_000;

/**
 * How much of Paystack's fee guests pay on card and MoMo in the app (BUILD.md section 4). Picking
 * a share turns fee passing on and saves at once; the example shows what a GH₵100 bill costs.
 */
export function FeesPage({ venueId, done }: PageProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const pay = usePayments(venueId);
  const fees: FeePassing = pay.settings.data?.feePassing ?? { enabled: false, percent: 100 };
  const example = formatMoney(pesewas(passedFee(EXAMPLE_BILL, fees.percent)), DEFAULT_CURRENCY);
  return (
    <DeskWait
      loading={pay.settings.isPending}
      error={pay.settings.isError}
      onRetry={() => void pay.settings.refetch()}
    >
      <TitledSection plain title={t('ownerPay.feesShare')}>
        <Chips
          single
          label={t('ownerPay.feesShare')}
          options={SHARES.map((share) => ({ id: String(share), label: `${share}%` }))}
          selected={fees.enabled ? [String(fees.percent)] : []}
          onChange={(ids) => {
            const percent = Number(ids[0]);
            if (percent) pay.setFees.mutate({ enabled: true, percent }, { onSuccess: done });
          }}
        />
        {fees.enabled ? (
          <Text variant="caption" style={{ color: theme.meta }}>
            {t('ownerPay.feesExample', {
              bill: formatMoney(pesewas(EXAMPLE_BILL), DEFAULT_CURRENCY),
              fee: example,
            })}
          </Text>
        ) : null}
      </TitledSection>
    </DeskWait>
  );
}
