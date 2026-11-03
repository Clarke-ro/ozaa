import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gamepad2, Gift, Receipt } from 'lucide-react-native';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { Programme } from './facts';
import { GroupCard } from './GroupCard';
import { GroupRow } from './GroupRow';
import { SectionTitle } from './SectionTitle';

/** Every way to earn at this venue, and how long earnings last. */
export function HowToEarn({
  programme,
  gameMinScore,
}: {
  programme: Programme;
  gameMinScore: number | null;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const stamps = programme.earn.kind === 'stamps';
  return (
    <View style={styles.section}>
      <SectionTitle>{t('loyalty.howToEarn')}</SectionTitle>
      <GroupCard>
        <GroupRow
          icon={Receipt}
          title={
            stamps
              ? t('loyalty.earnStampVisit')
              : t('loyalty.earnPointsSpend', {
                  points: programme.earn.points,
                  spend: formatMoney(pesewas(programme.earn.perMinor), programme.currency),
                })
          }
          detail={stamps ? t('loyalty.earnStampVisitSub') : t('loyalty.earnPointsSpendSub')}
        />
        {gameMinScore != null ? (
          <GroupRow
            icon={Gamepad2}
            title={t('loyalty.earnGame', { score: gameMinScore })}
            detail={t('loyalty.earnGameSub')}
          />
        ) : null}
        {programme.birthdayTreat ? (
          <GroupRow
            icon={Gift}
            title={t('loyalty.earnBirthday')}
            detail={programme.birthdayTreat}
          />
        ) : null}
      </GroupCard>
      <Text variant="caption" style={{ color: theme.meta }}>
        {programme.expiryDays
          ? t('loyalty.expiryDays', { days: programme.expiryDays })
          : t('loyalty.expiryNever')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space[3] },
});
