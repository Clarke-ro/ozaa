import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Clock, Receipt } from 'lucide-react-native';
import type { SalesReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { BarChart, BarList, cardStyle, hourLabel, TitledSection } from '../../kit';

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** Sales by hour as bars with the busiest hour said in words, beside money taken by each person. */
export function SalesHourStaff({ report: r, wide }: { report: SalesReport; wide: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = (amount: number) => formatMoney(pesewas(amount), r.currency);
  const peak = [...r.byHour].sort((a, b) => b.pesewas - a.pesewas)[0];
  const staff = [...r.byStaff].sort((a, b) => b.pesewas - a.pesewas);
  return (
    <View style={[styles.row, !wide && styles.stack]}>
      <TitledSection
        title={t('ownerSales.byHourTitle')}
        style={wide ? { flex: 1.3 } : undefined}
        cardStyle={styles.hours}
      >
        {peak && peak.pesewas > 0 ? (
          <>
            <BarChart
              bars={r.byHour.map((h) => ({ label: hourLabel(h.hour), value: h.pesewas }))}
              format={money}
              summary={t('ownerSales.byHourTitle')}
            />
            <View style={[styles.tip, { borderTopColor: theme.wash }]}>
              <Clock size={18} color={theme.ink} />
              <Text style={styles.tipText}>
                {t('ownerSales.peakTip', { hour: hourLabel(peak.hour) })}
              </Text>
            </View>
          </>
        ) : (
          <Text variant="body" style={{ color: theme.muted }}>
            {t('ownerSales.empty')}
          </Text>
        )}
      </TitledSection>
      <TitledSection
        title={t('ownerSales.byStaffTitle')}
        style={wide ? { flex: 1 } : undefined}
        cardStyle={styles.staff}
      >
        {staff.length === 0 ? (
          <Text variant="body" style={[styles.empty, { color: theme.muted }]}>
            {t('ownerSales.noStaff')}
          </Text>
        ) : (
          <BarList
            rows={staff.map((p) => ({
              key: p.staffId,
              label: p.firstName,
              sub: `· ${t(`ownerSettings.roles.${p.role}`)} · ${t('ownerSales.orders', { count: p.orders })}`,
              value: money(p.pesewas),
              share: pct(p.pesewas, r.valuePesewas),
              lead: (
                <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
                  <Text style={[styles.initials, { color: theme.badgeInk }]}>
                    {p.firstName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              ),
            }))}
          />
        )}
      </TitledSection>
    </View>
  );
}

/** E-VAT: the totals once tax is set up; before that, one row saying how to turn it on. */
export function SalesTax({ report: r }: { report: SalesReport }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const money = (amount: number) => formatMoney(pesewas(amount), r.currency);
  return (
    <View style={styles.taxWrap}>
      <Text variant="title" accessibilityRole="header">
        {t('ownerSales.taxTitle')}
      </Text>
      {r.tax ? (
        <View style={[cardStyle(theme), styles.taxCard]}>
          <BarList
            rows={[
              {
                key: 'vat',
                label: 'VAT',
                value: money(r.tax.vatPesewas),
                share: pct(r.tax.vatPesewas, r.tax.totalPesewas),
              },
              {
                key: 'nhil',
                label: 'NHIL',
                value: money(r.tax.nhilPesewas),
                share: pct(r.tax.nhilPesewas, r.tax.totalPesewas),
              },
              {
                key: 'getfund',
                label: 'GETFund',
                value: money(r.tax.getfundPesewas),
                share: pct(r.tax.getfundPesewas, r.tax.totalPesewas),
              },
            ]}
          />
        </View>
      ) : (
        <View style={[cardStyle(theme), styles.taxRow]}>
          <Receipt size={22} color={theme.text} />
          <View style={styles.taxWords}>
            <Text style={styles.taxTitle}>{t('ownerSales.taxOffTitle')}</Text>
            <Text style={[styles.taxSub, { color: theme.meta }]}>{t('ownerSales.taxOffBody')}</Text>
          </View>
          <Button
            label={t('ownerSales.taxSetUp')}
            tone="secondary"
            onPress={() => router.push('/owner/business')}
            style={styles.short}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', gap: tokens.space[6] },
  stack: { flexDirection: 'column' },
  hours: { padding: tokens.owner.controls.cardPadding, gap: 14 },
  staff: { paddingTop: 0, paddingBottom: 6, paddingHorizontal: tokens.owner.controls.cardPadding },
  empty: { paddingVertical: tokens.space[4] },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1 },
  tipText: { flex: 1, fontSize: 15, lineHeight: 22 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 14, lineHeight: 18, fontFamily: fontFamily.strong },
  taxWrap: { gap: tokens.space[4] },
  taxCard: { paddingVertical: 6, paddingHorizontal: tokens.owner.controls.cardPadding },
  taxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: tokens.owner.controls.cardPadding,
  },
  taxWords: { flexGrow: 1, flexBasis: 260, minWidth: 0, gap: 2 },
  taxTitle: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  taxSub: { fontSize: 14, lineHeight: 20 },
  short: { minHeight: 44 },
});
