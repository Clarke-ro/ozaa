import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Armchair, Bell, Receipt, Users, type LucideIcon } from 'lucide-react-native';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { FLOOR_TONES, type FloorTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Grain } from '../../kit';

export type FloorStatus = 'free' | 'seated' | 'ordered' | 'waiting_to_pay' | 'needs_waiter';

// Four colour families: empty, occupied, paying, and calling for a waiter.
export const TONE_OF: Record<FloorStatus, FloorTone> = {
  free: 'free',
  seated: 'occupied',
  ordered: 'occupied',
  waiting_to_pay: 'paying',
  needs_waiter: 'calling',
};

const ICON: Record<FloorTone, LucideIcon> = {
  free: Armchair,
  occupied: Users,
  paying: Receipt,
  calling: Bell,
};

export const STATUS_LABEL: Record<FloorStatus, string> = {
  free: 'owner.free',
  seated: 'owner.seated',
  ordered: 'owner.ordered',
  waiting_to_pay: 'owner.waitingPay',
  needs_waiter: 'owner.needsWaiter',
};

export function FloorTile({
  code,
  label,
  status,
  billPesewas,
  currency,
  selected,
  onPress,
}: {
  code: string;
  label?: string;
  status: FloorStatus;
  billPesewas?: number | null;
  currency: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const tone = TONE_OF[status];
  const look = FLOOR_TONES[theme.scheme][tone];
  const Icon = ICON[tone];
  const word = t(STATUS_LABEL[status]);
  const bill = billPesewas ? formatMoney(pesewas(billPesewas), currency) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[`${t('ownerFloor.table')} ${label ?? code}`, word, bill]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: look.bg,
          borderColor: selected ? theme.text : look.edge,
          borderWidth: selected ? 2.5 : 1,
        },
        pressed && styles.pressed,
      ]}
    >
      <Grain />
      <View style={styles.top}>
        <Text variant="display-m" style={{ color: look.ink }}>
          {code}
        </Text>
        <View style={[styles.badge, { backgroundColor: look.edge }]}>
          <Icon size={16} color={look.ink} strokeWidth={2.4} />
        </View>
      </View>
      <View>
        <Text variant="body-strong" numberOfLines={1} style={{ color: look.ink }}>
          {word}
        </Text>
        <Text
          variant="caption"
          numberOfLines={1}
          style={{ color: look.ink, opacity: bill ? 1 : 0 }}
        >
          {bill ?? ' '}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 112,
    padding: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  pressed: { transform: [{ scale: 0.97 }] },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
