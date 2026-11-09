import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { PriceText } from '@/ui/PriceText';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { payStyles } from './payStyles';

/**
 * The table's bill, line by line. With "My items" each unpaid line becomes a tick box; lines
 * someone already paid for are greyed out and can't be picked.
 */
export function BillLines({
  order,
  picking,
  mine,
  onToggle,
  currency,
}: {
  order: Order;
  picking: boolean;
  mine: readonly string[];
  onToggle: (lineId: string) => void;
  currency: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[payStyles.card, { backgroundColor: theme.surface }]}>
      {order.lines.map((line) => {
        const picked = mine.includes(line.id);
        const pickable = picking && !line.paid;
        return (
          <Pressable
            key={line.id}
            disabled={!pickable}
            accessibilityRole={pickable ? 'checkbox' : undefined}
            accessibilityState={pickable ? { checked: picked } : undefined}
            onPress={() => onToggle(line.id)}
            style={payStyles.line}
          >
            {picking ? (
              <View
                style={[
                  styles.box,
                  {
                    borderColor: picked ? theme.ink : theme.line,
                    backgroundColor: picked ? theme.ink : theme.surface,
                  },
                ]}
              >
                {picked ? <Check size={14} color={theme.white} strokeWidth={3} /> : null}
              </View>
            ) : null}
            <Text variant="body" style={[payStyles.flex, line.paid && { color: theme.meta }]}>
              {line.quantity} × {line.name}
            </Text>
            {line.paid ? (
              <Text variant="caption" style={{ color: theme.success }}>
                {t('pay.linePaid')}
              </Text>
            ) : (
              <PriceText amount={line.totalPesewas} currency={currency} />
            )}
          </Pressable>
        );
      })}
      <View style={[payStyles.line, payStyles.total, { borderColor: theme.line }]}>
        <Text variant="body-strong" style={payStyles.flex}>
          {t('pay.tableTotal')}
        </Text>
        <PriceText amount={order.totalPesewas} currency={currency} size="title" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderRadius: tokens.radius.sm - 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
