import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Cake, Gamepad2, Gift, History, Receipt, type LucideIcon } from 'lucide-react-native';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import type { HistoryRow, Programme } from './facts';
import { GroupCard } from './GroupCard';
import { GroupRow } from './GroupRow';
import { SectionTitle } from './SectionTitle';

const SOURCE_ICON: Record<HistoryRow['source'], LucideIcon> = {
  paid_visit: Receipt,
  game: Gamepad2,
  birthday: Cake,
  redeem: Gift,
};

/** Newest first: what was earned or spent, when, and how many stamps or points. */
export function ActivityList({
  history,
  programme,
}: {
  history: readonly HistoryRow[];
  programme: Programme;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  const title = (row: HistoryRow) =>
    row.source === 'paid_visit'
      ? t('loyalty.historyVisit', {
          amount: formatMoney(pesewas(row.amountMinor ?? 0), row.currency ?? programme.currency),
        })
      : row.source === 'game'
        ? t('loyalty.historyGame')
        : row.source === 'birthday'
          ? (row.title ?? t('loyalty.historyBirthday'))
          : t('loyalty.historyRedeem', { title: row.title ?? '' });

  return (
    <View style={styles.section}>
      <SectionTitle>{t('loyalty.historyTitle')}</SectionTitle>
      <GroupCard>
        {history.length === 0 ? (
          <GroupRow
            icon={History}
            title={t('loyalty.historyEmptyTitle')}
            detail={t('loyalty.historyEmpty')}
          />
        ) : (
          [...history].reverse().map((row, index) => {
            const earned = row.direction === 'in';
            return (
              <GroupRow
                key={`${row.at}-${index}`}
                icon={SOURCE_ICON[row.source]}
                title={title(row)}
                detail={date(row.at)}
                right={
                  <Text
                    variant="body-strong"
                    accessibilityLabel={
                      earned
                        ? t('loyalty.unitsIn', { count: row.units })
                        : t('loyalty.unitsOut', { count: row.units })
                    }
                    style={[styles.units, { color: earned ? theme.success : theme.text }]}
                  >
                    {earned ? `+${row.units}` : `−${row.units}`}
                  </Text>
                }
              />
            );
          })
        )}
      </GroupCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space[3] },
  units: { fontFamily: fontFamily.strong, fontVariant: ['tabular-nums'] },
});
