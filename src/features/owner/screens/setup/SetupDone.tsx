import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CircleCheck, CreditCard, QrCode, Store, Wifi, type LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { LinkRow, cardStyle } from '../../kit';
import type { Step, SummaryRow } from './setupFlow';

const ICON: Record<Step, LucideIcon> = {
  venue: Store,
  tables: QrCode,
  wifi: Wifi,
  payments: CreditCard,
};

/**
 * "You're ready": what was set up, one card per step. Tapping a card goes back to that step, so
 * nothing is final. Then the next real job: print the table QR codes.
 */
export function SetupDone({ rows, onEdit }: { rows: SummaryRow[]; onEdit: (step: Step) => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { wide } = useOwnerLayout();

  const value = (row: SummaryRow): string => {
    switch (row.step) {
      case 'venue':
        return row.value ?? t('ownerSetup.summary.noName');
      case 'tables':
        return t('ownerSetup.summary.tables', { count: row.value });
      case 'wifi':
        return row.value ?? t('ownerSetup.summary.notAdded');
      case 'payments':
        return t(`ownerSetup.summary.${row.value}`);
    }
  };

  return (
    <View style={styles.stack}>
      <View style={styles.head}>
        <CircleCheck size={40} color={theme.success} />
        <Text variant="display-m" accessibilityRole="header">
          {t('ownerSetup.doneTitle')}
        </Text>
      </View>
      <View style={styles.cards}>
        {rows.map((row) => (
          <View key={row.step} style={[cardStyle(theme), styles.card]}>
            <LinkRow
              icon={ICON[row.step]}
              label={t(`ownerSetup.steps.${row.step}`)}
              value={value(row)}
              onPress={() => onEdit(row.step)}
            />
          </View>
        ))}
      </View>
      <View style={[styles.actions, wide && styles.actionsWide]}>
        <Button label={t('ownerSetup.printQr')} onPress={() => router.push('/owner/tables')} />
        <Button
          label={t('ownerSetup.openFloor')}
          tone="ghost"
          onPress={() => router.push('/owner/floor')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[6] },
  head: { gap: tokens.space[2] },
  cards: { gap: tokens.space[3] },
  // The row brings its own padding; the card clips its pressed colour to the rounded corners.
  card: { overflow: 'hidden' },
  actions: { gap: tokens.space[2] },
  actionsWide: { flexDirection: 'row', alignItems: 'center' },
});
