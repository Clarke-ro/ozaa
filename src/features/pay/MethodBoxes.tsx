import { Pressable, StyleSheet, View } from 'react-native';
import { Banknote, CreditCard, Smartphone, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { PayPick } from './payPick';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const BOX: Record<PayPick, { icon: LucideIcon; title: string; sub: string }> = {
  momo: { icon: Smartphone, title: 'payment.momo', sub: 'payment.momoNets' },
  cash: { icon: Banknote, title: 'payment.cash', sub: 'payment.cashTable' },
  card: { icon: CreditCard, title: 'payment.card', sub: 'payment.cardKinds' },
};

/**
 * MoMo, Cash and Card as square boxes in a row (design canvas, Clarke 2026-11-23). MoMo covers
 * MTN, Telecel and AT: the guest picks the network on Paystack's page.
 */
export function MethodBoxes({
  methods,
  value,
  onChange,
  delivery,
}: {
  methods: PayPick[];
  value: PayPick;
  onChange: (pick: PayPick) => void;
  /** Cash is paid to the rider, not at the table. */
  delivery: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('pay.with')} style={styles.row}>
      {methods.map((id) => {
        const box = BOX[id];
        const on = id === value;
        const Icon = box.icon;
        const sub = id === 'cash' && delivery ? 'payment.cashDelivery' : box.sub;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            accessibilityLabel={`${t(box.title)}, ${t(sub)}`}
            onPress={() => onChange(id)}
            style={({ pressed }) => [
              styles.box,
              {
                borderColor: on ? theme.fill : 'transparent',
                backgroundColor: on ? theme.tint : pressed ? theme.wash : theme.white,
              },
            ]}
          >
            <Icon size={26} color={on ? theme.ink : theme.text} strokeWidth={2} />
            <Text variant="body-strong">{t(box.title)}</Text>
            <Text variant="caption" numberOfLines={2} style={[styles.sub, { color: theme.muted }]}>
              {t(sub)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[2] + 2 },
  box: {
    flex: 1,
    maxWidth: 140,
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: tokens.space[2],
  },
  sub: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
});
