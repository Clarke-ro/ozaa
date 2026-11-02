import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard, Smartphone, type LucideIcon } from 'lucide-react-native';
import type { VenueTransaction } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { StatusPill, type PillTone } from '../../kit';

const ICON: Record<VenueTransaction['method'], LucideIcon> = {
  momo: Smartphone,
  card: CreditCard,
  cash: Banknote,
};

function tone(tx: VenueTransaction): PillTone {
  if (tx.status !== 'succeeded') return 'error';
  if (tx.settlement === 'settled') return 'success';
  if (tx.settlement === 'refunded') return 'neutral';
  return 'waiting';
}

/** One payment: how it was paid, which order and when on the left; amount and state on the right. */
export function TransactionRow({
  tx,
  amount,
  first,
  onPress,
}: {
  tx: VenueTransaction;
  /** The amount already formatted in the venue currency. */
  amount: string;
  first: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const Icon = ICON[tx.method];
  const when = new Date(tx.createdAt).toLocaleString(i18n.language, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const state =
    tx.status === 'succeeded'
      ? t(`ownerPayments.settlement.${tx.settlement}`)
      : t(`ownerPayments.status.${tx.status}`);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('ownerPayments.orderTitle', { number: tx.orderNumber })}, ${amount}, ${state}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.wash : undefined }]}
    >
      <View style={[styles.icon, { backgroundColor: theme.wash }]}>
        <Icon size={20} color={theme.text} />
      </View>
      <View
        style={[
          styles.body,
          first ? null : { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.line },
        ]}
      >
        <View style={styles.flex}>
          <Text variant="body-strong" numberOfLines={1}>
            {t('ownerPayments.orderTitle', { number: tx.orderNumber })}
          </Text>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {t(`ownerPayments.methods.${tx.method}`)} · {when}
          </Text>
        </View>
        <View style={styles.right}>
          <Text variant="body-strong" style={styles.num}>
            {amount}
          </Text>
          <StatusPill label={state} tone={tone(tx)} icon={false} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingStart: tokens.space[4],
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 68,
    paddingVertical: tokens.space[3],
    paddingEnd: tokens.space[4],
  },
  flex: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  num: { fontVariant: ['tabular-nums'] },
});
