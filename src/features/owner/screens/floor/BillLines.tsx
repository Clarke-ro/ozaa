import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

/** The dishes on a table's open order, one per line, with hairlines between them. */
export function BillLines({ lines, currency }: { lines: Order['lines']; currency: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (lines.length === 0) {
    return (
      <Text variant="body" style={{ color: theme.muted }}>
        {t('owner.noBill')}
      </Text>
    );
  }
  return (
    <View>
      {lines.map((line, index) => (
        <View
          key={line.id}
          style={[
            styles.line,
            index > 0 && { borderTopColor: theme.line, borderTopWidth: StyleSheet.hairlineWidth },
          ]}
        >
          <Text variant="body" style={styles.qty}>
            {t('ownerFloor.qty', { count: line.quantity })}
          </Text>
          <Text variant="body" style={styles.name}>
            {line.name}
          </Text>
          <Text variant="body" style={styles.money}>
            {formatMoney(pesewas(line.totalPesewas), currency)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// A fixed column, so the dish names line up under each other.
const QTY_WIDTH = tokens.space[8];

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: tokens.space[2],
    paddingVertical: tokens.space[2],
  },
  qty: { fontFamily: fontFamily.strong, minWidth: QTY_WIDTH, fontVariant: ['tabular-nums'] },
  name: { flex: 1 },
  money: { fontVariant: ['tabular-nums'] },
});
