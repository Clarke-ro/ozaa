import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Armchair, Bell, Receipt, Users, type LucideIcon } from 'lucide-react-native';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { FLOOR_TONES, type FloorTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

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
          backgroundColor: theme.surface,
          // Clean white card; tables that need someone (calling, paying) keep a coloured edge.
          borderColor: selected ? theme.text : look.edge,
          borderWidth: selected ? 2 : tone === 'calling' || tone === 'paying' ? 1.5 : 0,
        },
        pressed && styles.pressed,
      ]}
    >
      {/* The status colour is a strip, not the whole tile: calm to scan, still quick to read. */}
      <View style={[styles.strip, { backgroundColor: look.edge }]} />
      <Text variant="display-m" style={{ color: theme.text }}>
        {code}
      </Text>
      <View>
        <View style={styles.state}>
          <Icon size={14} color={look.ink} strokeWidth={2.4} />
          <Text variant="caption" numberOfLines={1} style={[styles.word, { color: look.ink }]}>
            {word}
          </Text>
        </View>
        <Text
          variant="caption"
          numberOfLines={1}
          style={{ color: theme.muted, opacity: bill ? 1 : 0 }}
        >
          {bill ?? ' '}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 104,
    padding: tokens.space[3],
    paddingTop: tokens.space[3] + 4,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    justifyContent: 'space-between',
    overflow: 'hidden',
    boxShadow: tokens.shadow.card,
  },
  strip: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  pressed: { transform: [{ scale: 0.97 }] },
  state: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  word: { fontFamily: fontFamily.strong, flexShrink: 1 },
});
