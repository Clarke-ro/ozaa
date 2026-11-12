import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { SalesReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { BarChart, ChartCard, hourLabel, RankTable } from '../../kit';

type Props = { report: SalesReport };
const useMoney = (r: SalesReport) => (amount: number) => formatMoney(pesewas(amount), r.currency);

/** Fully paid orders by how they were paid: MoMo, card, cash, bank transfer and so on. */
export function ByMethod({ report: r }: Props) {
  const { t } = useTranslation();
  const money = useMoney(r);
  const rows = (r.payments.byMethod ?? []).map((row) => ({
    label: t(`ownerSales.method.${row.method}`),
    value: money(row.pesewas),
    detail: t('ownerSales.ordersCount', { count: row.orders }),
  }));
  return (
    <ChartCard
      title={t('ownerSales.byMethod')}
      empty={rows.length ? undefined : t('ownerSales.noPaid')}
    >
      <RankTable
        nameHead={t('ownerSales.methodHead')}
        valueHead={t('ownerSales.valueHead')}
        rows={rows}
      />
    </ChartCard>
  );
}

/** Order value by hour of the day, on the venue's clock. */
export function ByHour({ report: r }: Props) {
  const { t } = useTranslation();
  const money = useMoney(r);
  return (
    <ChartCard
      title={t('ownerSales.byHour')}
      empty={r.byHour.length ? undefined : t('ownerSales.empty')}
    >
      <BarChart
        bars={r.byHour.map((h) => ({ label: hourLabel(h.hour), value: h.pesewas }))}
        format={money}
        summary={t('ownerSales.byHour')}
      />
    </ChartCard>
  );
}

/** Who took or served the orders. Guest QR orders nobody touched aren't anyone's. */
export function ByStaff({ report: r }: Props) {
  const { t } = useTranslation();
  const money = useMoney(r);
  const rows = r.byStaff.map((row) => ({
    label: row.firstName,
    value: money(row.pesewas),
    detail: `${t(`ownerSettings.roles.${row.role}`)} · ${t('ownerSales.ordersCount', { count: row.orders })}`,
  }));
  return (
    <ChartCard
      title={t('ownerSales.byStaff')}
      empty={rows.length ? undefined : t('ownerSales.noStaff')}
    >
      <RankTable
        nameHead={t('ownerSales.staffHead')}
        valueHead={t('ownerSales.valueHead')}
        rows={rows}
      />
    </ChartCard>
  );
}

/** E-VAT and levies once tax is set up; before that, the way to set it up. */
export function TaxCard({ report: r }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const money = useMoney(r);
  if (!r.tax) {
    return (
      <ChartCard title={t('ownerSales.tax')} caption={t('ownerSales.taxOff')}>
        <Pressable accessibilityRole="link" onPress={() => router.push('/owner/business')}>
          <Text variant="body-strong" style={{ color: theme.ink }}>
            {t('ownerSales.taxSetUp')}
          </Text>
        </Pressable>
      </ChartCard>
    );
  }
  return (
    <ChartCard
      title={t('ownerSales.tax')}
      figure={money(r.tax.totalPesewas)}
      rows={[
        { label: 'VAT', value: money(r.tax.vatPesewas) },
        { label: 'NHIL', value: money(r.tax.nhilPesewas) },
        { label: 'GETFund', value: money(r.tax.getfundPesewas) },
      ]}
    />
  );
}
